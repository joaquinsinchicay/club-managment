import type { DashboardTreasuryCard as DashboardTreasuryCardData, TreasuryCategory, TreasuryAccount } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

type TreasuryCardProps = {
  treasuryCard: DashboardTreasuryCardData;
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  openDailyCashSessionAction: () => Promise<void>;
  closeDailyCashSessionAction: () => Promise<void>;
  createTreasuryMovementAction: (formData: FormData) => Promise<void>;
};

function getSessionLabel(status: DashboardTreasuryCardData["sessionStatus"]) {
  if (status === "open") {
    return texts.dashboard.treasury.session_open;
  }

  if (status === "closed") {
    return texts.dashboard.treasury.session_closed;
  }

  return texts.dashboard.treasury.session_not_started;
}

export function TreasuryCard({
  treasuryCard,
  accounts,
  categories,
  openDailyCashSessionAction,
  closeDailyCashSessionAction,
  createTreasuryMovementAction
}: TreasuryCardProps) {
  const canCreateMovement = treasuryCard.availableActions.includes("create_movement");
  const canCloseSession = treasuryCard.availableActions.includes("close_session");
  const canOpenSession = treasuryCard.availableActions.includes("open_session");

  return (
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">
          {texts.dashboard.treasury.title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {texts.dashboard.treasury.description}
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-border bg-secondary/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {texts.dashboard.treasury.session_label}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {getSessionLabel(treasuryCard.sessionStatus)}
          </p>
        </div>

        {treasuryCard.accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            {texts.dashboard.treasury.empty_accounts}
          </div>
        ) : (
          <div className="grid gap-3">
            {treasuryCard.accounts.map((account) => (
              <article key={account.accountId} className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="text-sm font-semibold text-foreground">{account.name}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {account.balances.map((balance) => (
                    <div key={`${account.accountId}-${balance.currencyCode}`} className="rounded-2xl border border-border/60 bg-card px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {balance.currencyCode}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{balance.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {canOpenSession ? (
            <form action={openDailyCashSessionAction}>
              <button
                type="submit"
                className="min-h-11 w-full rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                {texts.dashboard.treasury.open_session_cta}
              </button>
            </form>
          ) : null}

          {canCloseSession ? (
            <form action={closeDailyCashSessionAction}>
              <button
                type="submit"
                className="min-h-11 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {texts.dashboard.treasury.close_session_cta}
              </button>
            </form>
          ) : null}
        </div>

        {canCreateMovement ? (
          <div className="rounded-[24px] border border-border bg-secondary/50 p-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {texts.dashboard.treasury.movement_form_title}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {texts.dashboard.treasury.movement_form_description}
              </p>
            </div>

            <form action={createTreasuryMovementAction} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
                <input
                  type="text"
                  value={treasuryCard.sessionDate}
                  disabled
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
                />
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.account_label}</span>
                <select
                  name="account_id"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.movement_type_label}</span>
                <select
                  name="movement_type"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  <option value="ingreso">{texts.dashboard.treasury.movement_types.ingreso}</option>
                  <option value="egreso">{texts.dashboard.treasury.movement_types.egreso}</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.category_label}</span>
                <select
                  name="category_id"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
                <input
                  type="text"
                  name="concept"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
                <select
                  name="currency_code"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  <option value="ARS">ARS</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.amount_label}</span>
                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                >
                  {texts.dashboard.treasury.create_cta}
                </button>
                <button
                  type="reset"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  {texts.dashboard.treasury.reset_cta}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
