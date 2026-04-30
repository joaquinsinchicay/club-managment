"use client";

import { useMemo, useState } from "react";

import { parseLocalizedAmount } from "@/lib/amounts";

export type SessionBalanceDraftBase = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  referenceBalance: number;
  declaredBalance: string;
};

export function useSessionBalanceDraft<TDraft extends SessionBalanceDraftBase>(
  initial: TDraft[],
) {
  const [drafts, setDrafts] = useState<TDraft[]>(initial);

  const hasDifferences = useMemo(
    () =>
      drafts.some((draft) => {
        const declared = parseLocalizedAmount(draft.declaredBalance);
        return declared !== null && Math.abs(declared - draft.referenceBalance) >= 0.01;
      }),
    [drafts],
  );

  const hasNegativeBalances = useMemo(
    () =>
      drafts.some((draft) => {
        const declared = parseLocalizedAmount(draft.declaredBalance);
        return declared !== null && declared < 0;
      }),
    [drafts],
  );

  function updateDraft(accountId: string, declaredBalance: string) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.accountId === accountId ? { ...draft, declaredBalance } : draft,
      ),
    );
  }

  return { drafts, updateDraft, hasDifferences, hasNegativeBalances };
}
