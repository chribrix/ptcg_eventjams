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
  PresentationChartLineIcon,
} from "@heroicons/vue/24/outline";

export type AdminNavItem = {
  label: string;
  to: string;
  icon: unknown;
  group: AdminNavGroup;
  match?: (path: string) => boolean;
};

export type AdminNavGroup = "overview" | "events" | "people" | "system";

export const adminNavigationGroups: Array<{ id: AdminNavGroup; label: string }> = [
  { id: "overview", label: "Überblick" },
  { id: "events", label: "Veranstaltungen" },
  { id: "people", label: "Personen & Läden" },
  { id: "system", label: "System" },
];

export const adminNavigationItems: AdminNavItem[] = [
  {
    label: "Übersicht",
    to: "/admin",
    icon: ChartBarIcon,
    group: "overview",
    match: (path) => path === "/admin",
  },
  {
    label: "Analyse",
    to: "/admin/analytics",
    icon: PresentationChartLineIcon,
    group: "overview",
    match: (path) => path.startsWith("/admin/analytics"),
  },
  {
    label: "Events",
    to: "/admin/events",
    icon: CalendarIcon,
    group: "events",
    match: (path) => path.startsWith("/admin/events"),
  },
  {
    label: "Turniere",
    to: "/admin/tournament-management",
    icon: PlayCircleIcon,
    group: "events",
    match: (path) => path.startsWith("/admin/tournament-management"),
  },
  {
    label: "Liga",
    to: "/admin/league",
    icon: TrophyIcon,
    group: "events",
    match: (path) => path.startsWith("/admin/league"),
  },
  {
    label: "Benutzer",
    to: "/admin/users",
    icon: UserCircleIcon,
    group: "people",
    match: (path) => path.startsWith("/admin/users"),
  },
  {
    label: "Spieler",
    to: "/admin/players",
    icon: UsersIcon,
    group: "people",
    match: (path) => path.startsWith("/admin/players"),
  },
  {
    label: "Mandanten",
    to: "/admin/tenants",
    icon: BuildingStorefrontIcon,
    group: "people",
    match: (path) => path.startsWith("/admin/tenants"),
  },
  {
    label: "Externe Events",
    to: "/admin/external-events",
    icon: Cog6ToothIcon,
    group: "events",
    match: (path) => path.startsWith("/admin/external-events"),
  },
  {
    label: "Orte",
    to: "/admin/venue",
    icon: BuildingStorefrontIcon,
    group: "events",
    match: (path) => path.startsWith("/admin/venue"),
  },
  {
    label: "Tags",
    to: "/admin/tags",
    icon: TagIcon,
    group: "events",
    match: (path) => path.startsWith("/admin/tags"),
  },
  {
    label: "Banner",
    to: "/admin/settings/banner",
    icon: Cog6ToothIcon,
    group: "system",
    match: (path) => path.startsWith("/admin/settings/banner"),
  },
  {
    label: "Protokolle",
    to: "/admin/logs",
    icon: ExclamationTriangleIcon,
    group: "system",
    match: (path) => path.startsWith("/admin/logs"),
  },
];
