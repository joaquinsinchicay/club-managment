import Link from "next/link";

import { texts } from "@/lib/texts";

export function TreasuryRoleShortcutCard() {
  return (
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">
          {texts.dashboard.treasury_role.shortcut_title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {texts.dashboard.treasury_role.shortcut_description}
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/dashboard/treasury"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          {texts.dashboard.treasury_role.shortcut_cta}
        </Link>
      </div>
    </section>
  );
}
