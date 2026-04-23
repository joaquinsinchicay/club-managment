"use client";

import { useState } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
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
    <Card tone="muted" padding="compact" className="bg-secondary/50">
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
          <Button variant="primary" onClick={() => setIsOpen(true)}>
            {texts.settings.club.invitations.toggle_cta}
          </Button>
        ) : null}
      </div>

      {isOpen ? (
        <form action={inviteUserAction} className="mt-5 grid gap-4">
          <PendingFieldset className="grid gap-4">
            <FormField>
              <FormFieldLabel>{texts.settings.club.invitations.email_label}</FormFieldLabel>
              <FormInput
                type="email"
                name="email"
                placeholder={texts.settings.club.invitations.email_placeholder}
              />
            </FormField>

            <FormField>
              <FormFieldLabel>{texts.settings.club.invitations.role_label}</FormFieldLabel>
              <FormSelect name="role" defaultValue="">
                <option value="" disabled>
                  {texts.settings.club.members.role_placeholder}
                </option>
                {membershipRoles.map((role) => (
                  <option key={role} value={role}>
                    {texts.settings.club.members.roles[role]}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <PendingSubmitButton
                idleLabel={texts.settings.club.invitations.invite_cta}
                pendingLabel={texts.settings.club.invitations.invite_loading}
                className={buttonClass({ variant: "primary", fullWidth: true })}
              />
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setIsOpen(false)}
              >
                {texts.settings.club.invitations.cancel_cta}
              </Button>
            </div>
          </PendingFieldset>
        </form>
      ) : null}
    </Card>
  );
}
