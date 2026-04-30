import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canManageClubMembers } from "@/lib/domain/authorization";
import type { Club, ClubType, TreasuryCurrencyCode } from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  formatCuit,
  hasValidCuitDv,
  hasValidCuitShape,
  normalizeCuit
} from "@/lib/validators/cuit";
import { isValidEmail, validatePhone } from "@/lib/validators/contact";
import {
  optimizePngBuffer,
  optimizeSvgBuffer,
  readPngDimensions,
  readSvgDimensions
} from "@/lib/services/logo-pipeline";
import { logger } from "@/lib/logger";

export type ClubIdentityActionCode =
  | "club_identity_updated"
  | "forbidden"
  | "club_not_found"
  | "invalid_name"
  | "invalid_cuit"
  | "invalid_cuit_dv"
  | "invalid_tipo"
  | "invalid_domicilio"
  | "invalid_email"
  | "invalid_telefono"
  | "invalid_telefono_missing_prefix"
  | "invalid_color"
  | "invalid_currency"
  | "invalid_logo"
  | "invalid_logo_dimensions"
  | "logo_upload_failed"
  | "logo_optimization_failed"
  | "unknown_error";

export type ClubIdentityActionResult = {
  ok: boolean;
  code: ClubIdentityActionCode;
};

export type UpdateClubIdentityInput = {
  name: string;
  cuit: string;
  tipo: string;
  domicilio: string;
  email: string;
  telefono: string;
  colorPrimary: string;
  colorSecondary: string;
  currencyCode: string;
  logoFile?: File | null;
  removeLogo?: boolean;
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ALLOWED_LOGO_MIME = new Set(["image/png", "image/svg+xml"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MIN_LOGO_DIMENSION = 256;
const VALID_CLUB_TYPES: ClubType[] = ["asociacion_civil", "fundacion", "sociedad_civil"];
const VALID_CURRENCY_CODES: TreasuryCurrencyCode[] = ["ARS", "USD"];
const LOGO_BUCKET = "club-logos";
const MIN_DOMICILIO_LENGTH = 4;
const MAX_DOMICILIO_LENGTH = 200;

function normalizeColor(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidClubType(value: string): value is ClubType {
  return (VALID_CLUB_TYPES as string[]).includes(value);
}

function isValidCurrencyCode(value: string): value is TreasuryCurrencyCode {
  return (VALID_CURRENCY_CODES as string[]).includes(value);
}

function extensionForMime(mime: string): "png" | "svg" | null {
  if (mime === "image/png") return "png";
  if (mime === "image/svg+xml") return "svg";
  return null;
}

function bucketPathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/${LOGO_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return publicUrl.slice(index + marker.length);
}

type LogoProcessingResult =
  | { ok: true; buffer: Buffer; contentType: "image/png" | "image/svg+xml"; extension: "png" | "svg" }
  | { ok: false; code: ClubIdentityActionCode };

function detectLogoKindFromBuffer(buffer: Buffer): "png" | "svg" | null {
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= PNG_SIGNATURE.length) {
    let matches = true;
    for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
      if (buffer[i] !== PNG_SIGNATURE[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return "png";
  }

  const head = buffer.subarray(0, 512).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "svg";
  }

  return null;
}

async function processLogoFile(file: File): Promise<LogoProcessingResult> {
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, code: "invalid_logo" };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const detected = detectLogoKindFromBuffer(inputBuffer);
  const extension = detected ?? extensionForMime(file.type);

  if (!extension) {
    return { ok: false, code: "invalid_logo" };
  }

  if (extension === "png") {
    const dims = readPngDimensions(inputBuffer);
    if (!dims) {
      return { ok: false, code: "invalid_logo" };
    }
    if (dims.width < MIN_LOGO_DIMENSION || dims.height < MIN_LOGO_DIMENSION) {
      return { ok: false, code: "invalid_logo_dimensions" };
    }

    try {
      const optimized = await optimizePngBuffer(inputBuffer);
      return { ok: true, buffer: optimized, contentType: "image/png", extension: "png" };
    } catch (error) {
      logger.error("[club-identity-service] png optimization failed", error);
      return { ok: false, code: "logo_optimization_failed" };
    }
  }

  const svgSource = inputBuffer.toString("utf8");
  const dims = readSvgDimensions(svgSource);
  if (dims && (dims.width < MIN_LOGO_DIMENSION || dims.height < MIN_LOGO_DIMENSION)) {
    return { ok: false, code: "invalid_logo_dimensions" };
  }

  try {
    const optimized = optimizeSvgBuffer(inputBuffer);
    return { ok: true, buffer: optimized, contentType: "image/svg+xml", extension: "svg" };
  } catch (error) {
    logger.error("[club-identity-service] svg optimization failed", error);
    return { ok: false, code: "logo_optimization_failed" };
  }
}

type LogoUploadResult =
  | { ok: true; publicUrl: string; objectName: string }
  | { ok: false; code: ClubIdentityActionCode };

async function uploadProcessedLogo(
  clubId: string,
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<LogoUploadResult> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return { ok: false, code: "logo_upload_failed" };
  }

  const objectName = `${clubId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(objectName, buffer, {
      contentType,
      upsert: true
    });

  if (uploadError) {
    logger.error("[club-identity-service] upload failed", uploadError);
    return { ok: false, code: "logo_upload_failed" };
  }

  const { data: publicUrl } = admin.storage.from(LOGO_BUCKET).getPublicUrl(objectName);
  if (!publicUrl?.publicUrl) {
    return { ok: false, code: "logo_upload_failed" };
  }

  return { ok: true, publicUrl: publicUrl.publicUrl, objectName };
}

async function removeBucketObject(path: string | null): Promise<void> {
  if (!path) return;
  const admin = createAdminSupabaseClient();
  if (!admin) return;
  const { error } = await admin.storage.from(LOGO_BUCKET).remove([path]);
  if (error) {
    logger.error("[club-identity-service] remove previous logo failed", error);
  }
}

export async function updateClubIdentityForActiveClub(
  input: UpdateClubIdentityInput
): Promise<ClubIdentityActionResult & { club?: Club }> {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return { ok: false, code: "forbidden" };
  }

  if (!canManageClubMembers(context.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;
  const previousLogoUrl = context.activeClub.logoUrl;

  const name = input.name?.trim() ?? "";
  if (name.length < 2) {
    return { ok: false, code: "invalid_name" };
  }

  const cuitDigits = normalizeCuit(input.cuit ?? "");
  const cuit = formatCuit(cuitDigits);
  if (!hasValidCuitShape(cuit)) {
    return { ok: false, code: "invalid_cuit" };
  }
  if (!hasValidCuitDv(cuitDigits)) {
    return { ok: false, code: "invalid_cuit_dv" };
  }

  const tipoRaw = (input.tipo ?? "").trim();
  if (!isValidClubType(tipoRaw)) {
    return { ok: false, code: "invalid_tipo" };
  }
  const tipo: ClubType = tipoRaw;

  const domicilio = (input.domicilio ?? "").trim();
  if (
    domicilio.length < MIN_DOMICILIO_LENGTH ||
    domicilio.length > MAX_DOMICILIO_LENGTH
  ) {
    return { ok: false, code: "invalid_domicilio" };
  }

  const email = (input.email ?? "").trim();
  if (!isValidEmail(email)) {
    return { ok: false, code: "invalid_email" };
  }

  const phoneCheck = validatePhone(input.telefono ?? "");
  if (!phoneCheck.ok) {
    return {
      ok: false,
      code:
        phoneCheck.reason === "missing_prefix"
          ? "invalid_telefono_missing_prefix"
          : "invalid_telefono"
    };
  }
  const telefono = phoneCheck.normalized;

  const colorPrimary = normalizeColor(input.colorPrimary ?? "");
  if (colorPrimary && !HEX_COLOR_REGEX.test(colorPrimary)) {
    return { ok: false, code: "invalid_color" };
  }

  const colorSecondary = normalizeColor(input.colorSecondary ?? "");
  if (colorSecondary && !HEX_COLOR_REGEX.test(colorSecondary)) {
    return { ok: false, code: "invalid_color" };
  }

  const currencyRaw = (input.currencyCode ?? "").trim().toUpperCase();
  if (!isValidCurrencyCode(currencyRaw)) {
    return { ok: false, code: "invalid_currency" };
  }
  const currencyCode: TreasuryCurrencyCode = currencyRaw;

  let logoUrlToPersist: string | null | undefined;
  let newLogoObjectName: string | null = null;

  if (input.removeLogo) {
    logoUrlToPersist = null;
  }

  if (input.logoFile && input.logoFile.size > 0) {
    const processed = await processLogoFile(input.logoFile);
    if (!processed.ok) {
      return { ok: false, code: processed.code };
    }

    const upload = await uploadProcessedLogo(
      clubId,
      processed.buffer,
      processed.contentType,
      processed.extension
    );
    if (!upload.ok) {
      return { ok: false, code: upload.code };
    }

    logoUrlToPersist = upload.publicUrl;
    newLogoObjectName = upload.objectName;
  }

  try {
    const updated = await accessRepository.updateClubIdentity(clubId, {
      name,
      cuit,
      tipo,
      domicilio,
      email,
      telefono,
      colorPrimary: colorPrimary === "" ? null : colorPrimary,
      colorSecondary: colorSecondary === "" ? null : colorSecondary,
      currencyCode,
      ...(logoUrlToPersist !== undefined ? { logoUrl: logoUrlToPersist } : {})
    });

    if (!updated) {
      if (newLogoObjectName) {
        await removeBucketObject(newLogoObjectName);
      }
      return { ok: false, code: "club_not_found" };
    }

    if (logoUrlToPersist !== undefined && previousLogoUrl) {
      const previousPath = bucketPathFromPublicUrl(previousLogoUrl);
      if (previousPath && previousPath !== newLogoObjectName) {
        await removeBucketObject(previousPath);
      }
    }

    return { ok: true, code: "club_identity_updated", club: updated };
  } catch (error) {
    logger.error("[club-identity-service] update failed", error);
    if (newLogoObjectName) {
      await removeBucketObject(newLogoObjectName);
    }
    return { ok: false, code: "unknown_error" };
  }
}
