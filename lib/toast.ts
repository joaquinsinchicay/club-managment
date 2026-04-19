import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastPayload = {
  kind: ToastKind;
  title: string;
  desc?: string;
  meta?: string;
  action?: ToastAction;
  duration?: number;
};

export type ToastEntry = ToastPayload & {
  id: string;
  createdAt: number;
  resolvedDuration: number;
};

const DEFAULT_DURATIONS: Record<ToastKind, number> = {
  success: 3000,
  warning: 5000,
  info: 4000,
  error: 0
};

export function defaultDurationFor(kind: ToastKind): number {
  return DEFAULT_DURATIONS[kind];
}

const MAX_VISIBLE = 3;

type Listener = (entries: ToastEntry[]) => void;

class ToastStore {
  private entries: ToastEntry[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;

  getSnapshot = (): ToastEntry[] => this.entries;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  push(payload: ToastPayload): string {
    const id = `t_${this.nextId++}`;
    const resolvedDuration = payload.duration ?? defaultDurationFor(payload.kind);
    const entry: ToastEntry = {
      ...payload,
      id,
      createdAt: Date.now(),
      resolvedDuration
    };

    const next = [...this.entries, entry];
    if (next.length > MAX_VISIBLE) {
      next.splice(0, next.length - MAX_VISIBLE);
    }
    this.entries = next;
    this.emit();
    return id;
  }

  dismiss(id: string): void {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) {
      return;
    }
    this.entries = next;
    this.emit();
  }

  clear(): void {
    if (this.entries.length === 0) {
      return;
    }
    this.entries = [];
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.entries);
    }
  }
}

const store = new ToastStore();

export function showToast(payload: ToastPayload): string {
  return store.push(payload);
}

export function dismissToast(id: string): void {
  store.dismiss(id);
}

export function clearToasts(): void {
  store.clear();
}

export function showSuccess(payload: Omit<ToastPayload, "kind">): string {
  return showToast({ ...payload, kind: "success" });
}

export function showError(payload: Omit<ToastPayload, "kind">): string {
  return showToast({ ...payload, kind: "error" });
}

export function showWarning(payload: Omit<ToastPayload, "kind">): string {
  return showToast({ ...payload, kind: "warning" });
}

export function showInfo(payload: Omit<ToastPayload, "kind">): string {
  return showToast({ ...payload, kind: "info" });
}

const EMPTY_SNAPSHOT: ToastEntry[] = [];

export function useToastEntries(): ToastEntry[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY_SNAPSHOT);
}

export const toastStoreInternals = {
  store,
  MAX_VISIBLE
};
