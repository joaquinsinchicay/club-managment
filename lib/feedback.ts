import { texts } from "@/lib/texts";

export type FeedbackTone = "destructive" | "success" | "warning";

export type FeedbackToast = {
  key: string;
  message: string;
  tone: FeedbackTone;
  dismissMs?: number;
};

const settingsSuccessFeedbackCodes = new Set([
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
  "field_rules_updated",
  "receipt_format_created",
  "receipt_format_updated"
]);

const dashboardSuccessFeedbackCodes = new Set([
  "active_club_updated",
  "session_opened",
  "session_closed",
  "movement_created",
  "movement_updated",
  "movement_integrated",
  "consolidation_completed"
]);

const loginErrorMessages = {
  oauth_cancelled: texts.auth.login.oauth_cancelled,
  oauth_generic_error: texts.auth.login.oauth_generic_error
} as const;

function resolveSettingsFeedback(code: string): FeedbackToast | null {
  const feedbackMessages = {
    ...(texts.settings.club.members.feedback as Record<string, string>),
    ...(texts.settings.club.invitations.feedback as Record<string, string>),
    ...(texts.settings.club.treasury.feedback as Record<string, string>)
  };
  const message = feedbackMessages[code];

  if (!message) {
    return null;
  }

  return {
    key: `settings-feedback-${code}`,
    message,
    tone: settingsSuccessFeedbackCodes.has(code) ? "success" : "destructive"
  };
}

function resolveDashboardFeedback(code: string): FeedbackToast | null {
  const feedbackMessages = texts.dashboard.feedback as Record<string, string>;
  const message = feedbackMessages[code];

  if (!message) {
    return null;
  }

  return {
    key: `dashboard-feedback-${code}`,
    message,
    tone: dashboardSuccessFeedbackCodes.has(code) ? "success" : "destructive"
  };
}

function resolveLoginError(code: string): FeedbackToast | null {
  const message = loginErrorMessages[code as keyof typeof loginErrorMessages];

  if (!message) {
    return null;
  }

  return {
    key: `login-error-${code}`,
    message,
    tone: "destructive"
  };
}

export function resolveFeedbackToast(
  pathname: string,
  searchParams: URLSearchParams
): { toast: FeedbackToast; consumedKeys: string[] } | null {
  const feedbackCode = searchParams.get("feedback");
  const errorCode = searchParams.get("error");

  if (pathname === "/settings/club" && feedbackCode) {
    const toast = resolveSettingsFeedback(feedbackCode);

    return toast ? { toast, consumedKeys: ["feedback"] } : null;
  }

  if ((pathname === "/dashboard" || pathname === "/dashboard/treasury") && feedbackCode) {
    const toast = resolveDashboardFeedback(feedbackCode);

    return toast ? { toast, consumedKeys: ["feedback"] } : null;
  }

  if (pathname === "/login" && errorCode) {
    const toast = resolveLoginError(errorCode);

    return toast ? { toast, consumedKeys: ["error"] } : null;
  }

  return null;
}
