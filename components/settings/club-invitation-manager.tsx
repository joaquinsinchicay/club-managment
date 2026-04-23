"use client";

import { useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { MembershipRole } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

type ClubInvitationManagerProps = {
  inviteUserAction: (formData: FormData) => Promise<void>;
};

const membershipRoles: MembershipRole[] = ["admin", "secretaria", "tesoreria"];

export function ClubInvitationManager({ inviteUserAction }: ClubInvitationManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-shell border border-border bg-secondary/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {texts.settings.club.invitations.section_title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {texts.settings.club.invitations.section_description}
          </p>
        </div>

        {!isOpen ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            {texts.settings.club.invitations.toggle_cta}
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <form action={inviteUserAction} className="mt-5 grid gap-4">
          <PendingFieldset className="grid gap-4">
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.invitations.email_label}</span>
              <input
                type="email"
                name="email"
                placeholder={texts.settings.club.invitations.email_placeholder}
                className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              />
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.invitations.role_label}</span>
              <select
                name="role"
                defaultValue=""
                className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              >
                <option value="" disabled>
                  {texts.settings.club.members.role_placeholder}
                </option>
                {membershipRoles.map((role) => (
                  <option key={role} value={role}>
                    {texts.settings.club.members.roles[role]}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <PendingSubmitButton
                idleLabel={texts.settings.club.invitations.invite_cta}
                pendingLabel={texts.settings.club.invitations.invite_loading}
                className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {texts.settings.club.invitations.cancel_cta}
              </button>
            </div>
          </PendingFieldset>
        </form>
      ) : null}
    </section>
  );
}
