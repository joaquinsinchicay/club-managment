import { texts } from "@/lib/texts";
import type { ToastKind } from "@/lib/toast";

const SUCCESS_CODES = new Set<string>([
  // Settings · members/invitations/treasury
  "invitation_created",
  "membership_approved",
  "membership_roles_updated",
  "membership_removed",
  "self_removed",
  "account_created",
  "account_updated",
  "category_created",
  "category_updated",
  "activity_created",
  "activity_updated",
  "calendar_event_updated",
  "receipt_format_created",
  "receipt_format_updated",

  // Settings · datos del club
  "club_identity_updated",

  // Dashboard · session/movements/consolidation
  "active_club_updated",
  "session_opened",
  "session_closed",
  "movement_created",
  "movement_updated",
  "movement_integrated",
  "transfer_created",
  "fx_operation_created",
  "consolidation_completed",

  // Dashboard · treasury · cost centers (US-52 / US-53)
  "cost_center_created",
  "cost_center_updated",
  "cost_center_closed",
  "cost_center_movement_links_synced",
  "cost_center_movement_unlinked",

  // Settings · RRHH · salary structures (US-54 / US-55)
  "salary_structure_created",
  "salary_structure_updated",
  "salary_structure_status_changed",
  "salary_structure_amount_updated",

  // Settings · RRHH · staff members (US-56)
  "staff_member_created",
  "staff_member_updated",

  // Settings · RRHH · staff contracts (US-57 / US-58)
  "staff_contract_created",
  "staff_contract_updated",
  "staff_contract_finalized",

  // Dashboard · RRHH · payroll settlements (US-61 / US-62 / US-63 / US-66)
  "settlement_generated",
  "settlement_confirmed",
  "settlement_confirmed_bulk",
  "settlement_annulled",
  "settlement_adjustment_added",
  "settlement_adjustment_updated",
  "settlement_adjustment_removed",
  "settlement_hours_loaded",
  "settlement_base_amount_updated",
  "settlement_notes_updated",

  // Dashboard · RRHH · payments (US-64 / US-65)
  "settlement_paid",
  "settlement_paid_batch"
]);

export type FeedbackDomain = "settings" | "dashboard";

export type FeedbackResolveOptions = {
  movementId?: string;
};

export type ResolvedFeedback = {
  kind: ToastKind;
  title: string;
};

function lookupMessage(domain: FeedbackDomain, code: string): string | undefined {
  if (domain === "settings") {
    const merged: Record<string, string> = {
      ...(texts.settings.club.members.feedback as Record<string, string>),
      ...(texts.settings.club.invitations.feedback as Record<string, string>),
      ...(texts.settings.club.treasury.feedback as Record<string, string>),
      ...(texts.settings.club.identity.feedback as Record<string, string>),
      ...(texts.settings.club.rrhh.feedback as Record<string, string>)
    };
    return merged[code];
  }

  const merged: Record<string, string> = {
    ...(texts.dashboard.feedback as Record<string, string>),
    ...(texts.settings.club.treasury.feedback as Record<string, string>),
    ...(texts.dashboard.treasury_role.cost_centers.feedback as Record<string, string>),
    ...(texts.rrhh.settlements.feedback as Record<string, string>)
  };
  return merged[code];
}

export function resolveFeedback(
  domain: FeedbackDomain,
  code: string,
  options: FeedbackResolveOptions = {}
): ResolvedFeedback {
  const raw = lookupMessage(domain, code);
  const fallback = texts.common.toast.generic_error_title;

  let title = raw ?? fallback;
  if (options.movementId && title.includes("{movementId}")) {
    title = title.replace("{movementId}", options.movementId);
  }

  return {
    kind: SUCCESS_CODES.has(code) ? "success" : "error",
    title
  };
}
