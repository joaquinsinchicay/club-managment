export type MembershipRole = "admin" | "secretaria" | "tesoreria";
export type MembershipStatus = "pendiente_aprobacion" | "activo" | "inactivo";

export type User = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  status: "active";
};

export type AvailableClub = {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
  status: MembershipStatus;
};

export type Membership = {
  id: string;
  userId: string;
  clubId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
};

export type ClubMember = {
  membershipId: string;
  userId: string;
  clubId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
};

export type ClubInvitation = {
  id: string;
  clubId: string;
  email: string;
  role: MembershipRole;
  status: "pending" | "used";
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

export type TreasuryAccount = {
  id: string;
  clubId: string;
  name: string;
  accountScope: "secretaria" | "tesoreria";
  currencies: string[];
};

export type TreasuryCategory = {
  id: string;
  clubId: string;
  name: string;
};

export type TreasurySessionStatus = "open" | "closed";

export type DailyCashSession = {
  id: string;
  clubId: string;
  sessionDate: string;
  status: TreasurySessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  openedByUserId: string | null;
  closedByUserId: string | null;
};

export type TreasuryMovement = {
  id: string;
  clubId: string;
  dailyCashSessionId: string;
  accountId: string;
  movementType: "ingreso" | "egreso";
  categoryId: string;
  concept: string;
  currencyCode: string;
  amount: number;
  movementDate: string;
  createdByUserId: string;
  status: "pending_consolidation";
  createdAt: string;
};

export type DashboardTreasuryCard = {
  sessionStatus: TreasurySessionStatus | "not_started";
  sessionDate: string;
  sessionId: string | null;
  accounts: Array<{
    accountId: string;
    name: string;
    balances: Array<{
      currencyCode: string;
      amount: number;
    }>;
  }>;
  availableActions: Array<"open_session" | "close_session" | "create_movement">;
};

export type Session = {
  userId: string;
  activeClubId: string | null;
};

export type AuthIdentity = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoogleProfileKey =
  | "new_pending"
  | "existing_pending"
  | "existing_active"
  | "existing_secretaria";

export type GoogleProfile = {
  profileKey: GoogleProfileKey;
  email: string;
  fullName: string;
  avatarUrl: string | null;
};
