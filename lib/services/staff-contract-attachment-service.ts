/**
 * Service layer para adjuntos de contrato (US-32).
 *
 * Usa el admin Supabase client para Storage (bucket privado) y la tabla
 * `staff_contract_attachments`. El service valida autorización y club scope;
 * los uploads/downloads NO exponen el bucket directamente a clientes —
 * siempre van vía server action + signed URL cuando aplica.
 */

import { randomUUID } from "node:crypto";

import { createRequiredAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { logger } from "@/lib/logger";

const BUCKET = "staff-contracts";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type StaffContractAttachment = {
  id: string;
  clubId: string;
  contractId: string;
  filePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByUserId: string | null;
};

export type ContractAttachmentCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "contract_not_found"
  | "file_missing"
  | "file_too_large"
  | "file_type_not_allowed"
  | "attachment_not_found"
  | "uploaded"
  | "deleted"
  | "unknown_error";

export type ContractAttachmentResult<T = void> =
  | { ok: true; code: ContractAttachmentCode; data?: T }
  | { ok: false; code: ContractAttachmentCode };

type GuardedContext = { userId: string; clubId: string };

async function guardRead():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: ContractAttachmentCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrMasters(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
  return { ok: true, context: { userId: session.user.id, clubId: session.activeClub.id } };
}

async function guardMutate():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: ContractAttachmentCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canMutateHrMasters(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
  return { ok: true, context: { userId: session.user.id, clubId: session.activeClub.id } };
}

function mapRow(row: {
  id: string;
  club_id: string;
  contract_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | string;
  uploaded_at: string;
  uploaded_by_user_id: string | null;
}): StaffContractAttachment {
  return {
    id: row.id,
    clubId: row.club_id,
    contractId: row.contract_id,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedAt: row.uploaded_at,
    uploadedByUserId: row.uploaded_by_user_id,
  };
}

export async function listContractAttachments(
  contractId: string,
): Promise<ContractAttachmentResult<{ attachments: StaffContractAttachment[] }>> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  const supabase = createRequiredAdminSupabaseClient();

  // Validar ownership del contrato.
  const { data: contract } = await supabase
    .from("staff_contracts")
    .select("id")
    .eq("id", contractId)
    .eq("club_id", guard.context.clubId)
    .maybeSingle();
  if (!contract) return { ok: false, code: "contract_not_found" };

  const { data, error } = await supabase
    .from("staff_contract_attachments")
    .select(
      "id,club_id,contract_id,file_path,file_name,mime_type,size_bytes,uploaded_at,uploaded_by_user_id",
    )
    .eq("club_id", guard.context.clubId)
    .eq("contract_id", contractId)
    .order("uploaded_at", { ascending: false });
  if (error) {
    logger.error("[contract-attachment-service.list]", error);
    return { ok: false, code: "unknown_error" };
  }
  return {
    ok: true,
    code: "uploaded",
    data: { attachments: (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0])) },
  };
}

export async function uploadContractAttachment(params: {
  contractId: string;
  file: File;
}): Promise<ContractAttachmentResult<{ attachment: StaffContractAttachment }>> {
  const guard = await guardMutate();
  if (!guard.ok) return { ok: false, code: guard.code };
  const ctx = guard.context;

  if (!params.file || params.file.size === 0) {
    return { ok: false, code: "file_missing" };
  }
  if (params.file.size > MAX_BYTES) {
    return { ok: false, code: "file_too_large" };
  }
  const mime = params.file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, code: "file_type_not_allowed" };
  }

  const supabase = createRequiredAdminSupabaseClient();

  const { data: contract } = await supabase
    .from("staff_contracts")
    .select("id")
    .eq("id", params.contractId)
    .eq("club_id", ctx.clubId)
    .maybeSingle();
  if (!contract) return { ok: false, code: "contract_not_found" };

  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const filePath = `${ctx.clubId}/${params.contractId}/${randomUUID()}-${safeName}`;

  const arrayBuffer = await params.file.arrayBuffer();
  const body = new Uint8Array(arrayBuffer);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, body, { contentType: mime, upsert: false });
  if (uploadErr) {
    logger.error("[contract-attachment-service.upload]", uploadErr);
    return { ok: false, code: "unknown_error" };
  }

  const { data, error } = await supabase
    .from("staff_contract_attachments")
    .insert({
      club_id: ctx.clubId,
      contract_id: params.contractId,
      file_path: filePath,
      file_name: params.file.name,
      mime_type: mime,
      size_bytes: params.file.size,
      uploaded_by_user_id: ctx.userId,
    })
    .select(
      "id,club_id,contract_id,file_path,file_name,mime_type,size_bytes,uploaded_at,uploaded_by_user_id",
    )
    .single();
  if (error || !data) {
    // Cleanup del archivo si la fila falla.
    await supabase.storage.from(BUCKET).remove([filePath]);
    logger.error("[contract-attachment-service.insert]", error);
    return { ok: false, code: "unknown_error" };
  }

  return {
    ok: true,
    code: "uploaded",
    data: { attachment: mapRow(data as Parameters<typeof mapRow>[0]) },
  };
}

export async function deleteContractAttachment(
  attachmentId: string,
): Promise<ContractAttachmentResult> {
  const guard = await guardMutate();
  if (!guard.ok) return { ok: false, code: guard.code };
  const ctx = guard.context;
  const supabase = createRequiredAdminSupabaseClient();

  const { data: existing, error: readErr } = await supabase
    .from("staff_contract_attachments")
    .select("id,club_id,file_path")
    .eq("id", attachmentId)
    .eq("club_id", ctx.clubId)
    .maybeSingle();
  if (readErr) {
    logger.error("[contract-attachment-service.delete.read]", readErr);
    return { ok: false, code: "unknown_error" };
  }
  if (!existing) return { ok: false, code: "attachment_not_found" };

  // Borrar storage + fila.
  await supabase.storage.from(BUCKET).remove([existing.file_path]);
  const { error } = await supabase
    .from("staff_contract_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("club_id", ctx.clubId);
  if (error) {
    logger.error("[contract-attachment-service.delete]", error);
    return { ok: false, code: "unknown_error" };
  }
  return { ok: true, code: "deleted" };
}

export async function getSignedUrlForAttachment(
  attachmentId: string,
): Promise<ContractAttachmentResult<{ url: string }>> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  const ctx = guard.context;
  const supabase = createRequiredAdminSupabaseClient();

  const { data: existing } = await supabase
    .from("staff_contract_attachments")
    .select("id,file_path")
    .eq("id", attachmentId)
    .eq("club_id", ctx.clubId)
    .maybeSingle();
  if (!existing) return { ok: false, code: "attachment_not_found" };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(existing.file_path, 60 * 5); // 5 minutos.
  if (error || !data) {
    logger.error("[contract-attachment-service.signed]", error);
    return { ok: false, code: "unknown_error" };
  }
  return { ok: true, code: "uploaded", data: { url: data.signedUrl } };
}
