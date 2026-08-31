import {
  ChartBarIcon,
  CalendarIcon,
  PlayCircleIcon,
  UserCircleIcon,
  UsersIcon,
  Cog6ToothIcon,
  TagIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  TrophyIcon,
} from "@heroicons/vue/24/outline";

export type AdminNavItem = {
  label: string;
  to: string;
  icon: unknown;
  match?: (path: string) => boolean;
};

export const adminNavigationItems: AdminNavItem[] = [
  {
    label: "Dashboard",
    to: "/admin",
    icon: ChartBarIcon,
    match: (path) => path === "/admin",
  },
  {
    label: "Events",
    to: "/admin/events",
    icon: CalendarIcon,
    match: (path) => path.startsWith("/admin/events"),
  },
  {
    label: "Tournament Management",
    to: "/admin/tournament-management",
    icon: PlayCircleIcon,
    match: (path) => path.startsWith("/admin/tournament-management"),
  },
  {
    label: "League Manager",
    to: "/admin/league",
    icon: TrophyIcon,
    match: (path) => path.startsWith("/admin/league"),
  },
  {
    label: "Users",
    to: "/admin/users",
    icon: UserCircleIcon,
    match: (path) => path.startsWith("/admin/users"),
  },
  {
    label: "Players",
    to: "/admin/players",
    icon: UsersIcon,
    match: (path) => path.startsWith("/admin/players"),
  },
  {
    label: "External Events",
    to: "/admin/external-events",
    icon: Cog6ToothIcon,
    match: (path) => path.startsWith("/admin/external-events"),
  },
  {
    label: "Venues",
    to: "/admin/venue",
    icon: BuildingStorefrontIcon,
    match: (path) => path.startsWith("/admin/venue"),
  },
  {
    label: "Tags",
    to: "/admin/tags",
    icon: TagIcon,
    match: (path) => path.startsWith("/admin/tags"),
  },
  {
    label: "Banner Settings",
    to: "/admin/settings/banner",
    icon: Cog6ToothIcon,
    match: (path) => path.startsWith("/admin/settings/banner"),
  },
  {
    label: "Logs",
    to: "/admin/logs",
    icon: ExclamationTriangleIcon,
    match: (path) => path.startsWith("/admin/logs"),
  },
];
