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

export type Membership = {
  id: string;
  userId: string;
  clubId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
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
