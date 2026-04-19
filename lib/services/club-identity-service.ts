import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canManageClubMembers } from "@/lib/domain/authorization";
import type { Club, ClubType } from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ClubIdentityActionCode =
  | "club_identity_updated"
  | "forbidden"
  | "club_not_found"
  | "invalid_name"
  | "invalid_cuit"
  | "invalid_tipo"
  | "invalid_color"
  | "invalid_logo"
  | "logo_upload_failed"
  | "unknown_error";

export type ClubIdentityActionResult = {
  ok: boolean;
  code: ClubIdentityActionCode;
};

export type UpdateClubIdentityInput = {
  name: string;
  cuit: string;
  tipo: string;
  colorPrimary: string;
  colorSecondary: string;
  logoFile?: File | null;
  removeLogo?: boolean;
};

const CUIT_REGEX = /^\d{2}-\d{8}-\d$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ALLOWED_LOGO_MIME = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const VALID_CLUB_TYPES: ClubType[] = ["asociacion_civil", "fundacion", "sociedad_civil"];
const LOGO_BUCKET = "club-logos";

function normalizeCuit(raw: string) {
  return raw.trim();
}

function normalizeColor(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidClubType(value: string): value is ClubType {
  return (VALID_CLUB_TYPES as string[]).includes(value);
}

function deriveExtensionFromMime(mime: string) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

async function uploadClubLogo(clubId: string, file: File): Promise<string | null> {
  if (!ALLOWED_LOGO_MIME.has(file.type)) {
    return null;
  }
  if (file.size > MAX_LOGO_BYTES) {
    return null;
  }

  const ext = deriveExtensionFromMime(file.type);
  if (!ext) {
    return null;
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return null;
  }

  const objectName = `${clubId}/logo-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(objectName, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    return null;
  }

  const { data: publicUrl } = admin.storage.from(LOGO_BUCKET).getPublicUrl(objectName);
  return publicUrl?.publicUrl ?? null;
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

  const name = input.name?.trim() ?? "";
  if (name.length < 2) {
    return { ok: false, code: "invalid_name" };
  }

  const cuit = normalizeCuit(input.cuit ?? "");
  if (cuit && !CUIT_REGEX.test(cuit)) {
    return { ok: false, code: "invalid_cuit" };
  }

  const tipoRaw = (input.tipo ?? "").trim();
  if (tipoRaw && !isValidClubType(tipoRaw)) {
    return { ok: false, code: "invalid_tipo" };
  }
  const tipo = tipoRaw ? (tipoRaw as ClubType) : null;

  const colorPrimary = normalizeColor(input.colorPrimary ?? "");
  if (colorPrimary && !HEX_COLOR_REGEX.test(colorPrimary)) {
    return { ok: false, code: "invalid_color" };
  }

  const colorSecondary = normalizeColor(input.colorSecondary ?? "");
  if (colorSecondary && !HEX_COLOR_REGEX.test(colorSecondary)) {
    return { ok: false, code: "invalid_color" };
  }

  let logoUrlToPersist: string | null | undefined = undefined;

  if (input.removeLogo) {
    logoUrlToPersist = null;
  }

  if (input.logoFile && input.logoFile.size > 0) {
    if (!ALLOWED_LOGO_MIME.has(input.logoFile.type) || input.logoFile.size > MAX_LOGO_BYTES) {
      return { ok: false, code: "invalid_logo" };
    }

    const uploaded = await uploadClubLogo(clubId, input.logoFile);
    if (!uploaded) {
      return { ok: false, code: "logo_upload_failed" };
    }
    logoUrlToPersist = uploaded;
  }

  try {
    const updated = await accessRepository.updateClubIdentity(clubId, {
      name,
      cuit: cuit === "" ? null : cuit,
      tipo,
      colorPrimary: colorPrimary === "" ? null : colorPrimary,
      colorSecondary: colorSecondary === "" ? null : colorSecondary,
      ...(logoUrlToPersist !== undefined ? { logoUrl: logoUrlToPersist } : {})
    });

    if (!updated) {
      return { ok: false, code: "club_not_found" };
    }

    return { ok: true, code: "club_identity_updated", club: updated };
  } catch (error) {
    console.error("[club-identity-service] update failed", error);
    return { ok: false, code: "unknown_error" };
  }
}
