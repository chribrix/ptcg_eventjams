const APPLICATION_LOCALES = ["de", "en"] as const;

const localePrefixPattern = new RegExp(
  `^/(?:${APPLICATION_LOCALES.join("|")})(?=/|$)`,
);

export const getApplicationRoutePath = (path: string): string =>
  path.replace(localePrefixPattern, "") || "/";
