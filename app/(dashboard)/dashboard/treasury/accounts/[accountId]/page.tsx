import { redirect } from "next/navigation";

/**
 * La vista de detalle de cuenta de Tesorería fue removida.
 * Los movimientos por cuenta se acceden desde la pestaña Movimientos
 * en /dashboard/treasury.
 */
export default function TreasuryAccountDetailPage() {
  redirect("/dashboard/treasury");
}
