"use client";

import { useMemo, useState } from "react";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { useServerAction } from "@/lib/hooks/use-server-action";
import {
  computeSelectionMode,
  findLatestPeriod,
  formatPeriodLong,
  type PeriodValue,
  type StatusFilter,
} from "@/lib/settlements-list-helpers";
import {
  currentPeriodYearMonth,
  formatPeriodLabel,
  type PayrollSettlement,
  type PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";

export function useSettlementsList(settlements: PayrollSettlement[]) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodValue>(
    () => findLatestPeriod(settlements) ?? currentPeriodYearMonth(),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<PayrollSettlement | null>(null);
  const [approvingOne, setApprovingOne] = useState<PayrollSettlement | null>(null);
  const [approvingBulk, setApprovingBulk] = useState(false);
  const [returning, setReturning] = useState<PayrollSettlement | null>(null);
  const [annulling, setAnnulling] = useState<PayrollSettlement | null>(null);
  const [paying, setPaying] = useState<PayrollSettlement | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);

  // Cada flow usa una instancia de useServerAction (encapsula
  // pending + triggerClientFeedback + router.refresh).
  const generate = useServerAction<SettlementActionResult>("dashboard");
  const approve = useServerAction<SettlementActionResult>("dashboard");
  const approveBulk = useServerAction<SettlementActionResult>("dashboard");
  const returnFlow = useServerAction<SettlementActionResult>("dashboard");
  const annul = useServerAction<SettlementActionResult>("dashboard");
  const pay = useServerAction<SettlementActionResult>("dashboard");
  const payBulk = useServerAction<SettlementActionResult>("dashboard");

  const settlementsForPeriod = useMemo(
    () =>
      settlements.filter(
        (s) =>
          s.periodYear === periodFilter.year && s.periodMonth === periodFilter.month,
      ),
    [settlements, periodFilter],
  );

  const countsByStatus = useMemo(() => {
    const map = new Map<PayrollSettlementStatus, number>();
    for (const s of settlementsForPeriod) {
      map.set(s.status, (map.get(s.status) ?? 0) + 1);
    }
    return map;
  }, [settlementsForPeriod]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return settlementsForPeriod.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const periodLabel = formatPeriodLabel(s.periodYear, s.periodMonth);
      return (
        (s.staffMemberName ?? "").toLowerCase().includes(q) ||
        (s.salaryStructureName ?? "").toLowerCase().includes(q) ||
        (s.salaryStructureRole ?? "").toLowerCase().includes(q) ||
        (s.salaryStructureActivityName ?? "").toLowerCase().includes(q) ||
        periodLabel.toLowerCase().includes(q)
      );
    });
  }, [settlementsForPeriod, search, statusFilter]);

  const periodLabelLong = formatPeriodLong(periodFilter.year, periodFilter.month);

  const selectableIds = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "generada" || s.status === "aprobada_rrhh")
        .map((s) => s.id),
    [filtered],
  );
  const allSelected =
    selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const selectedSettlements = useMemo(
    () => filtered.filter((s) => selectedIds.includes(s.id)),
    [filtered, selectedIds],
  );
  const selectedHasZero = selectedSettlements.some((s) => s.totalAmount === 0);
  const selectedTotal = selectedSettlements.reduce((acc, s) => acc + s.totalAmount, 0);
  const selectionMode = computeSelectionMode(selectedSettlements);

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleAll() {
    setSelectedIds((prev) => (prev.length === selectableIds.length ? [] : selectableIds));
  }
  function clearSelection() {
    setSelectedIds([]);
  }

  return {
    // filter state
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    periodFilter,
    setPeriodFilter,
    periodLabelLong,

    // selection
    selectedIds,
    selectableIds,
    allSelected,
    selectedSettlements,
    selectedHasZero,
    selectedTotal,
    selectionMode,
    toggleSelection,
    toggleAll,
    clearSelection,

    // derived data
    settlementsForPeriod,
    countsByStatus,
    filtered,

    // modal state
    generateOpen,
    setGenerateOpen,
    editingDetail,
    setEditingDetail,
    approvingOne,
    setApprovingOne,
    approvingBulk,
    setApprovingBulk,
    returning,
    setReturning,
    annulling,
    setAnnulling,
    paying,
    setPaying,
    payingBulk,
    setPayingBulk,

    // server actions wrappers
    generate,
    approve,
    approveBulk,
    returnFlow,
    annul,
    pay,
    payBulk,
  };
}

export type SettlementsListController = ReturnType<typeof useSettlementsList>;
