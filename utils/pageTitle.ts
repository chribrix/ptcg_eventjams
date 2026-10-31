import { getApplicationRoutePath } from "~/utils/applicationRoutePath";

/** Fallback for pages that do not supply a more specific document title. */
export function pageTitleForPath(path: string): string {
  const route = getApplicationRoutePath(path);
  if (route.startsWith("/admin")) return "Administration – ChrispyJams";
  if (route.startsWith("/tournaments/") && route.endsWith("/qr")) return "Turnier QR-Display – ChrispyJams";
  if (route.startsWith("/tournaments/")) return "Turnieransicht – ChrispyJams";
  if (route.startsWith("/e/")) return "Turnierzugang – ChrispyJams";
  if (route.startsWith("/events/register/")) return "Event-Anmeldung – ChrispyJams";
  if (route.startsWith("/events/")) return "Eventdetails – ChrispyJams";
  if (route.startsWith("/booking/")) return "Buchung – ChrispyJams";
  const labels: Record<string, string> = {
    "/": "Startseite", "/events": "Events", "/eventlist": "Events", "/dashboard": "Dashboard",
    "/league": "Liga", "/profile": "Profil", "/login": "Anmelden", "/register": "Registrieren",
    "/about": "Über uns", "/set-password": "Passwort festlegen", "/confirm": "Anmeldung bestätigen",
    "/magic-login": "Anmelden", "/password-set-success": "Passwort gesetzt",
  };
  return `${labels[route] || "ChrispyJams"} – ChrispyJams`;
}
