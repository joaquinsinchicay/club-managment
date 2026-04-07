import { AvatarSessionMenu } from "@/components/navigation/avatar-session-menu";
import type { SessionContext } from "@/lib/auth/service";
import { formatMembershipRoles } from "@/lib/domain/membership-roles";
import { canAccessClubSettingsNavigation } from "@/lib/domain/authorization";
import { texts } from "@/lib/texts";

type AppHeaderProps = {
  context: SessionContext;
};

function replaceTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template
  );
}

export function AppHeader({ context }: AppHeaderProps) {
  const roleLabel = context.activeMembership
    ? formatMembershipRoles(context.activeMembership.roles)
    : texts.dashboard.role_pending;
  const clubLabel = context.activeClub?.name ?? texts.header.pending_club_label;
  const welcomeMessage = context.activeMembership
    ? replaceTemplate(
        context.activeMembership.roles.length > 1
          ? texts.header.welcome_message_multiple
          : texts.header.welcome_message_single,
        {
        name: context.user.fullName,
        role: roleLabel
        }
      )
    : null;

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{clubLabel}</p>
          {welcomeMessage ? (
            <p className="truncate text-xs text-muted-foreground">{welcomeMessage}</p>
          ) : (
            <p className="truncate text-xs text-muted-foreground">{context.user.fullName}</p>
          )}
        </div>

        <AvatarSessionMenu
          fullName={context.user.fullName}
          email={context.user.email}
          avatarUrl={context.user.avatarUrl}
          canAccessClubSettings={canAccessClubSettingsNavigation(context.activeMembership)}
        />
      </div>
    </header>
  );
}
