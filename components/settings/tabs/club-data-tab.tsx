"use client";

import { useRef, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { Club, ClubType } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";
import { formatCuit, normalizeCuit } from "@/lib/validators/cuit";

type ClubDataTabProps = {
  club: Club;
  canEdit: boolean;
  updateClubIdentityAction: (formData: FormData) => Promise<void>;
};

const CLUB_TYPE_VALUES: ClubType[] = ["asociacion_civil", "fundacion", "sociedad_civil"];

function getClubInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

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
    // Restaura el File seleccionado al input si el browser lo vaciet re-render
    // (pasa cuando un server action redirige sin remontar el componente).
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    formRef.current?.reset();
  }

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
                  "group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-2xl font-semibold text-primary transition",
                  canEdit
                    ? "cursor-pointer hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    : "cursor-not-allowed opacity-70"
                )}
                style={
                  colorPrimary
                    ? { borderColor: colorPrimary }
                    : undefined
                }
                aria-label={
                  logoPreview ? identityTexts.logo_replace_cta : identityTexts.logo_upload_cta
                }
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt={club.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getClubInitial(club.name)}</span>
                )}
                {canEdit ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border border-border bg-foreground text-primary-foreground shadow-sm transition group-hover:scale-105"
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

            <label className="grid flex-1 gap-2 text-sm text-foreground">
              <span className="font-medium">
                {identityTexts.name_label}
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                name="name"
                defaultValue={club.name}
                placeholder={identityTexts.name_placeholder}
                minLength={2}
                maxLength={80}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                required
              />
            </label>

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

          <p className="text-xs text-muted-foreground">{identityTexts.logo_description}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">
                {identityTexts.cuit_label}
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              </span>
              <input
                type="text"
                name="cuit"
                value={cuit}
                onChange={(event) => setCuit(event.target.value)}
                onBlur={handleCuitBlur}
                placeholder={identityTexts.cuit_placeholder}
                inputMode="numeric"
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                required
              />
              <span className="text-xs text-muted-foreground">{identityTexts.cuit_helper}</span>
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">
                {identityTexts.tipo_label}
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              </span>
              <select
                name="tipo"
                defaultValue={club.tipo ?? ""}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                required
              >
                <option value="" disabled>{identityTexts.tipo_placeholder}</option>
                {CLUB_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {identityTexts.tipo_options[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm text-foreground">
            <span className="font-medium">
              {identityTexts.domicilio_label}
              <span className="ml-1 text-destructive" aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              name="domicilio"
              defaultValue={club.domicilio ?? ""}
              placeholder={identityTexts.domicilio_placeholder}
              minLength={4}
              maxLength={200}
              className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">
                {identityTexts.email_label}
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              </span>
              <input
                type="email"
                name="email"
                defaultValue={club.email ?? ""}
                placeholder={identityTexts.email_placeholder}
                autoComplete="email"
                inputMode="email"
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">
                {identityTexts.telefono_label}
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              </span>
              <input
                type="tel"
                name="telefono"
                defaultValue={club.telefono ?? ""}
                placeholder={identityTexts.telefono_placeholder}
                inputMode="tel"
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                required
              />
              <span className="text-xs text-muted-foreground">{identityTexts.telefono_helper}</span>
            </label>
          </div>
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
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{identityTexts.color_primary_label}</span>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-2">
                <input
                  type="color"
                  name="color_primary"
                  value={colorPrimary}
                  onChange={(event) => setColorPrimary(event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-transparent"
                />
                <span className="font-mono text-xs text-muted-foreground">{colorPrimary}</span>
              </div>
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{identityTexts.color_secondary_label}</span>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-2">
                <input
                  type="color"
                  name="color_secondary"
                  value={colorSecondary}
                  onChange={(event) => setColorSecondary(event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-transparent"
                />
                <span className="font-mono text-xs text-muted-foreground">{colorSecondary}</span>
              </div>
            </label>
          </div>

          <div className="grid gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {identityTexts.color_preview_label}
            </span>
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
                className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold text-primary-foreground"
                style={{ backgroundColor: colorPrimary }}
              >
                {club.name}
              </span>
            </div>
          </div>
        </section>

        {canEdit ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              {identityTexts.cancel_cta}
            </button>
            <PendingSubmitButton
              idleLabel={identityTexts.save_cta}
              pendingLabel={identityTexts.save_loading}
              className="min-h-11 rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            />
          </div>
        ) : null}
      </PendingFieldset>
    </form>
  );
}
