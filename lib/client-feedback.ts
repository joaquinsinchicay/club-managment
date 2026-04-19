"use client";

import { resolveFeedback, type FeedbackDomain, type FeedbackResolveOptions } from "@/lib/feedback-catalog";
import { showToast } from "@/lib/toast";

export function triggerClientFeedback(
  domain: FeedbackDomain,
  code: string,
  options: FeedbackResolveOptions = {}
): void {
  const { kind, title } = resolveFeedback(domain, code, options);
  showToast({ kind, title });
}
