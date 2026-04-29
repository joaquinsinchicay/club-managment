"use client";

import { useRef, useState } from "react";

import { Avatar, getInitials } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import {
  FormError,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { Club, ClubType, TreasuryCurrencyCode } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";
import { isValidEmail, validatePhone } from "@/lib/validators/contact";
import { formatCuit, normalizeCuit } from "@/lib/validators/cuit";

type ClubDataTabProps = {
  club: Club;
  canEdit: boolean;
  updateClubIdentityAction: (formData: FormData) => Promise<void>;
};

const CLUB_TYPE_VALUES: ClubType[] = ["asociacion_civil", "fundacion", "sociedad_civil"];
const CURRENCY_VALUES: TreasuryCurrencyCode[] = ["ARS", "USD"];

export function ClubDataTab({ club, canEdit, updateClubIdentityAction }: ClubDataTabProps) {
  const identityTexts = texts.settings.club.identity;
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(club.logoUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [colorPrimary, setColorPrimary] = useState<string>(club.colorPrimary ?? "#0f172a");
  const [colorSecondary, setColorSecondary] = useState<string>(club.colorSecondary ?? "#e2e8f0");
  const [cuit, setCuit] = useState<string>(club.cuit ?? "");
  const [email, setEmail] = useState<string>(club.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [telefono, setTelefono] = useState<string>(club.telefono ?? "");
  const [telefonoError, setTelefonoError] = useState<string | null>(null);

  function handleEmailBlur(event: React.FocusEvent<HTMLInputElement>) {
    const value = event.target.value.trim();
    if (!value) {
      setEmailError(null);
      return;
    }
    setEmailError(isValidEmail(value) ? null : identityTexts.feedback.invalid_email);
  }

  function handleTelefonoBlur(event: React.FocusEvent<HTMLInputElement>) {
    const value = event.target.value.trim();
    if (!value) {
      setTelefonoError(null);
      return;
    }
    const result = validatePhone(value);
    if (result.ok) {
      setTelefono(result.normalized);
      setTelefonoError(null);
      return;
    }
    setTelefonoError(
      result.reason === "missing_prefix"
        ? identityTexts.feedback.invalid_telefono_missing_prefix
        : identityTexts.feedback.invalid_telefono,
    );
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setSelectedFile(file);
    setPendingRemove(false);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setSelectedFile(null);
    setPendingRemove(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFormSubmit() {
    if (selectedFile && fileInputRef.current) {
      const currentFiles = fileInputRef.current.files;
      if (!currentFiles || currentFiles.length === 0) {
        try {
          const dt = new DataTransfer();
          dt.items.add(selectedFile);
          fileInputRef.current.files = dt.files;
        } catch (error) {
          console.warn("[club-data-tab] DataTransfer restore failed", error);
        }
      }
    }
  }

  function handleCuitBlur(event: React.FocusEvent<HTMLInputElement>) {
    const digits = normalizeCuit(event.target.value);
    if (digits.length === 11) {
      setCuit(formatCuit(digits));
    }
  }

  function handleCancel() {
    setLogoPreview(club.logoUrl);
    setSelectedFile(null);
    setPendingRemove(false);
    setColorPrimary(club.colorPrimary ?? "#0f172a");
    setColorSecondary(club.colorSecondary ?? "#e2e8f0");
    setCuit(club.cuit ?? "");
    setEmail(club.email ?? "");
    setEmailError(null);
    setTelefono(club.telefono ?? "");
    setTelefonoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    formRef.current?.reset();
  }

  const logoInitials = getInitials(club.name);

  return (
    <form
      ref={formRef}
      action={updateClubIdentityAction}
      onSubmit={handleFormSubmit}
      className="grid gap-8"
      encType="multipart/form-data"
    >
      <PendingFieldset className="grid gap-8" disabled={!canEdit}>
        <section className="grid gap-5">
          <header className="grid gap-1">
            <h2 className="text-lg font-semibold text-foreground">
              {identityTexts.section_title}
            </h2>
            <p className="text-sm text-muted-foreground">{identityTexts.section_description}</p>
          </header>

          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => canEdit && fileInputRef.current?.click()}
                disabled={!canEdit}
                className={cn(
                  "group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border transition",
                  canEdit
                    ? "cursor-pointer hover:ring-2 hover:ring-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10"
                    : "cursor-not-allowed opacity-70"
                )}
                aria-label={
                  logoPreview ? identityTexts.logo_replace_cta : identityTexts.logo_upload_cta
                }
              >
                {logoPreview ? (
                  <span className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt={club.name}
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <Avatar name={club.name} fallback={logoInitials} size="lg" tone="accent" />
                )}
                {canEdit ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border border-border bg-foreground text-background shadow-sm transition group-hover:scale-105"
                    aria-hidden="true"
                  >
                    <svg
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </span>
                ) : null}
              </button>
              {logoPreview && canEdit ? (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs font-medium text-destructive hover:underline"
                >
                  {identityTexts.logo_remove_cta}
                </button>
              ) : null}
            </div>

            <FormField className="flex-1">
              <FormFieldLabel required>{identityTexts.name_label}</FormFieldLabel>
              <FormInput
                type="text"
                name="name"
                defaultValue={club.name}
                placeholder={identityTexts.name_placeholder}
                minLength={2}
                maxLength={80}
                required
              />
            </FormField>

            <input
              ref={fileInputRef}
              type="file"
              name="logo"
              accept="image/png,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
            {pendingRemove ? <input type="hidden" name="remove_logo" value="on" /> : null}
          </div>

          <FormHelpText>{identityTexts.logo_description}</FormHelpText>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel required>{identityTexts.cuit_label}</FormFieldLabel>
              <FormInput
                type="text"
                name="cuit"
                value={cuit}
                onChange={(event) => setCuit(event.target.value)}
                onBlur={handleCuitBlur}
                placeholder={identityTexts.cuit_placeholder}
                inputMode="numeric"
                required
              />
              <FormHelpText>{identityTexts.cuit_helper}</FormHelpText>
            </FormField>

            <FormField>
              <FormFieldLabel required>{identityTexts.tipo_label}</FormFieldLabel>
              <FormSelect name="tipo" defaultValue={club.tipo ?? ""} required>
                <option value="" disabled>
                  {identityTexts.tipo_placeholder}
                </option>
                {CLUB_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {identityTexts.tipo_options[value]}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          <FormField>
            <FormFieldLabel required>{identityTexts.domicilio_label}</FormFieldLabel>
            <FormInput
              type="text"
              name="domicilio"
              defaultValue={club.domicilio ?? ""}
              placeholder={identityTexts.domicilio_placeholder}
              minLength={4}
              maxLength={200}
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel required>{identityTexts.email_label}</FormFieldLabel>
              <FormInput
                type="email"
                name="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={handleEmailBlur}
                placeholder={identityTexts.email_placeholder}
                autoComplete="email"
                inputMode="email"
                required
              />
              {emailError ? <FormError>{emailError}</FormError> : null}
            </FormField>

            <FormField>
              <FormFieldLabel required>{identityTexts.telefono_label}</FormFieldLabel>
              <FormInput
                type="tel"
                name="telefono"
                value={telefono}
                onChange={(event) => {
                  setTelefono(event.target.value);
                  if (telefonoError) setTelefonoError(null);
                }}
                onBlur={handleTelefonoBlur}
                placeholder={identityTexts.telefono_placeholder}
                inputMode="tel"
                required
              />
              <FormHelpText>{identityTexts.telefono_helper}</FormHelpText>
              {telefonoError ? <FormError>{telefonoError}</FormError> : null}
            </FormField>
          </div>

          <FormField>
            <FormFieldLabel required>{identityTexts.currency_label}</FormFieldLabel>
            <FormSelect name="currency_code" defaultValue={club.currencyCode} required>
              {CURRENCY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {identityTexts.currency_options[value]}
                </option>
              ))}
            </FormSelect>
            <FormHelpText>{identityTexts.currency_helper}</FormHelpText>
          </FormField>
        </section>

        <section className="grid gap-5">
          <header className="grid gap-1">
            <h2 className="text-lg font-semibold text-foreground">
              {identityTexts.colors_section_title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {identityTexts.colors_section_description}
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel>{identityTexts.color_primary_label}</FormFieldLabel>
              <div className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-card px-4 py-2">
                <input
                  type="color"
                  name="color_primary"
                  value={colorPrimary}
                  onChange={(event) => setColorPrimary(event.target.value)}
                  className="h-8 w-10 cursor-pointer rounded-card border border-border bg-transparent"
                />
                <span className="font-mono text-xs text-muted-foreground">{colorPrimary}</span>
              </div>
            </FormField>

            <FormField>
              <FormFieldLabel>{identityTexts.color_secondary_label}</FormFieldLabel>
              <div className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-card px-4 py-2">
                <input
                  type="color"
                  name="color_secondary"
                  value={colorSecondary}
                  onChange={(event) => setColorSecondary(event.target.value)}
                  className="h-8 w-10 cursor-pointer rounded-card border border-border bg-transparent"
                />
                <span className="font-mono text-xs text-muted-foreground">{colorSecondary}</span>
              </div>
            </FormField>
          </div>

          <div className="grid gap-2 rounded-card border border-border bg-card px-4 py-3 text-sm">
            <FormSection>{identityTexts.color_preview_label}</FormSection>
            <div className="flex items-center gap-3">
              <span
                className="h-8 w-8 rounded-full border border-border"
                style={{ backgroundColor: colorPrimary }}
                aria-hidden="true"
              />
              <span
                className="h-8 w-8 rounded-full border border-border"
                style={{ backgroundColor: colorSecondary }}
                aria-hidden="true"
              />
              <span
                className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold text-background"
                style={{ backgroundColor: colorPrimary }}
              >
                {club.name}
              </span>
            </div>
          </div>
        </section>

        {canEdit ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              {identityTexts.cancel_cta}
            </Button>
            <PendingSubmitButton
              idleLabel={identityTexts.save_cta}
              pendingLabel={identityTexts.save_loading}
              className={buttonClass({ variant: "primary" })}
            />
          </div>
        ) : null}
      </PendingFieldset>
    </form>
  );
}
