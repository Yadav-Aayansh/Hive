import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  AwardIcon,
  BellIcon,
  BuildingIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MegaphoneIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { HiveMark } from "@/components/hive-mark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/errors";
import { labelOf } from "@/lib/labels";
import { logout } from "@/lib/queries/auth";
import { collegeQueryOptions } from "@/lib/queries/colleges";
import { unreadCountQueryOptions } from "@/lib/queries/notifications";
import {
  isOnboarded,
  meQueryOptions,
  useMe,
  type UserDto,
} from "@/lib/queries/me";

const SCOPE_ITEMS = [
  { value: "events", label: "Events" },
  { value: "clubs", label: "Clubs" },
  { value: "announcements", label: "Announcements" },
];

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    let user: UserDto;

    try {
      user = await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        throw redirect({ to: "/login" });
      }
      throw error;
    }

    if (!isOnboarded(user)) {
      throw redirect({ to: "/onboarding" });
    }

    return { user };
  },
  component: AuthLayout,
});

const MAIN_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { to: "/clubs", label: "Clubs", icon: UsersIcon },
  { to: "/events", label: "Events", icon: CalendarDaysIcon },
  { to: "/announcements", label: "Announcements", icon: MegaphoneIcon },
] as const;

const ADMIN_NAV = [
  { to: "/college", label: "College", icon: BuildingIcon },
  { to: "/notifications", label: "Notifications", icon: BellIcon },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

const STUDENT_NAV = [
  { to: "/certificates", label: "Certificates", icon: AwardIcon },
  { to: "/notifications", label: "Notifications", icon: BellIcon },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function AuthLayout() {
  const user = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const [term, setTerm] = useState("");
  const [scope, setScope] = useState("events");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const unread = useQuery(unreadCountQueryOptions);
  const college = useQuery({
    ...collegeQueryOptions(user.collegeSlug ?? ""),
    enabled: user.collegeSlug !== null,
  }).data;
  const unreadCount = unread.data ?? 0;

  const personalNav = user.role === "student" ? STUDENT_NAV : ADMIN_NAV;

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      void navigate({ to: "/login", replace: true });
    },
    onError: () => {
      toast.add({ title: "Could not sign you out", type: "error" });
    },
  });

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname === to : pathname.startsWith(to);

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-1">
                <SidebarMenuButton
                  size="lg"
                  className="hover:bg-transparent group-data-[collapsible=icon]:hidden"
                  render={<Link to="/dashboard" />}
                >
                  {college?.logoUrl ? (
                    <img
                      src={college.logoUrl}
                      alt=""
                      className="size-9 shrink-0 rounded-xl object-cover"
                      onError={(broken) => {
                        broken.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <HiveMark className="size-9" />
                  )}
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-heading text-entry">
                      Hive
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {college?.name ?? user.collegeSlug}
                    </span>
                  </div>
                </SidebarMenuButton>
                <SidebarTrigger className="hidden shrink-0 md:flex" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] tracking-[0.14em] uppercase">
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MAIN_NAV.map((item) => (
                  <NavRow
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item.to)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] tracking-[0.14em] uppercase">
              You
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {personalNav.map((item) => (
                  <NavRow
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item.to)}
                    badge={
                      item.to === "/notifications" && unreadCount > 0
                        ? unreadCount
                        : undefined
                    }
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <ConfirmDialog
                trigger={
                  <SidebarMenuButton
                    disabled={signOut.isPending}
                    tooltip="Log out"
                    className="text-muted-foreground"
                  />
                }
                triggerLabel={
                  <>
                    <LogOutIcon />
                    <span>Log out</span>
                  </>
                }
                title="Log out of Hive?"
                description="You will need your email and password to get back in."
                confirmLabel="Log out"
                destructive
                pending={signOut.isPending}
                onConfirm={() => signOut.mutate()}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="md:m-2 md:ml-0 md:rounded-2xl md:border md:shadow-sm">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl md:rounded-t-2xl">
          <SidebarTrigger className="-ml-1 md:hidden" />

          <form
            className="hidden max-w-lg flex-1 items-center gap-2 sm:flex"
            onSubmit={(event) => {
              event.preventDefault();
              const search = term.trim();
              const query = search ? { search } : {};

              if (scope === "clubs") {
                void navigate({ to: "/clubs", search: query });
              } else if (scope === "announcements") {
                void navigate({ to: "/announcements", search: query });
              } else {
                void navigate({ to: "/events", search: query });
              }
            }}
          >
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={`Search ${scope}`}
                aria-label={`Search ${scope}`}
                className="h-10 bg-muted/60 pl-9"
              />
            </div>
            <button type="submit" className="sr-only">
              Search
            </button>
            <Select
              items={SCOPE_ITEMS}
              value={scope}
              onValueChange={(next) => setScope(String(next))}
            >
              <SelectTrigger className="h-10 w-44" aria-label="Search in">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              aria-label="Notifications"
              render={<Link to="/notifications" />}
            >
              <BellIcon />
              {unreadCount > 0 ? (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              ) : null}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Announcements"
              render={<Link to="/announcements" />}
            >
              <MegaphoneIcon />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-1 text-left transition-colors hover:bg-muted"
                  />
                }
              >
                <Avatar className="size-8">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                </Avatar>
                <span className="hidden leading-tight lg:grid">
                  <span className="truncate text-sm font-medium">
                    {user.fullName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{labelOf(user.role)}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link to="/profile" />}>
                    <UserIcon />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={signOut.isPending}
                    onClick={() => setConfirmLogout(true)}
                  >
                    <LogOutIcon />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmDialog
              open={confirmLogout}
              onOpenChange={setConfirmLogout}
              title="Log out of Hive?"
              description="You will need your email and password to get back in."
              confirmLabel="Log out"
              destructive
              pending={signOut.isPending}
              onConfirm={() => signOut.mutate()}
            />
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

function NavRow({
  to,
  label,
  icon: Icon,
  active,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof UsersIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        isActive={active}
        className="h-10 rounded-xl data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm"
        render={<Link to={to} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
      {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}
