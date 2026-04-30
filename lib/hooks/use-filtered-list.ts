/**
 * lib/hooks/use-filtered-list.ts — Hook canónico para listas con search +
 * filtros custom (status, role, category, etc).
 *
 * Encapsula `useState` para search + `useMemo` para el filtrado, con un
 * shape consistente entre tabs (staff-members, staff-contracts, etc).
 *
 * Cada consumer pasa SU predicado de search (qué campos buscar) y SU
 * predicado de filtro (qué status/rol incluir). El hook no asume nada
 * del shape de T.
 *
 * Uso típico:
 *
 *   const { search, setSearch, filtered } = useFilteredList({
 *     items: members,
 *     searchPredicate: (m, q) =>
 *       m.firstName.toLowerCase().includes(q) ||
 *       m.lastName.toLowerCase().includes(q),
 *     filterPredicate: (m) =>
 *       (vinculoFilter === "all" || m.vinculoType === vinculoFilter) &&
 *       (contractFilter === "all" || m.hasActiveContract === (contractFilter === "with_active")),
 *   });
 */

"use client";

import { useMemo, useState } from "react";

export type UseFilteredListOptions<T> = {
  items: T[];
  /**
   * Predicado opcional de búsqueda. Recibe el item y la query ya normalizada
   * (trimmed + lowercased). Si no se informa, el search se ignora.
   */
  searchPredicate?: (item: T, query: string) => boolean;
  /**
   * Predicado opcional de filtros adicionales (status, rol, etc).
   * Si no se informa, todos los items pasan el filtro.
   */
  filterPredicate?: (item: T) => boolean;
};

export type UseFilteredListReturn<T> = {
  search: string;
  setSearch: (value: string) => void;
  filtered: T[];
};

export function useFilteredList<T>({
  items,
  searchPredicate,
  filterPredicate,
}: UseFilteredListOptions<T>): UseFilteredListReturn<T> {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterPredicate && !filterPredicate(item)) return false;
      if (!q || !searchPredicate) return true;
      return searchPredicate(item, q);
    });
  }, [items, search, searchPredicate, filterPredicate]);

  return { search, setSearch, filtered };
}
