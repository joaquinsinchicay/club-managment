import { accessRepository } from "@/lib/repositories/access-repository";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";

export type SetActiveClubResultCode =
  | "active_club_updated"
  | "forbidden"
  | "club_not_available";

export type SetActiveClubResult = {
  ok: boolean;
  code: SetActiveClubResultCode;
  clubId?: string;
};

export async function setActiveClubForCurrentUser(clubId: string): Promise<SetActiveClubResult> {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    return { ok: false, code: "forbidden" };
  }

  const membership = context.activeMemberships.find((entry) => entry.clubId === clubId);

  if (!membership || membership.status !== "activo") {
    return { ok: false, code: "club_not_available" };
  }

  await accessRepository.setLastActiveClubId(context.user.id, clubId);

  return {
    ok: true,
    code: "active_club_updated",
    clubId
  };
}
