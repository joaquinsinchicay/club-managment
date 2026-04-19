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

  // Dashboard · session/movements/consolidation
  "active_club_updated",
  "session_opened",
  "session_closed",
  "movement_created",
  "movement_updated",
  "movement_integrated",
  "transfer_created",
  "fx_operation_created",
  "consolidation_completed"
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
      ...(texts.settings.club.treasury.feedback as Record<string, string>)
    };
    return merged[code];
  }

  const merged: Record<string, string> = {
    ...(texts.dashboard.feedback as Record<string, string>),
    ...(texts.settings.club.treasury.feedback as Record<string, string>)
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
