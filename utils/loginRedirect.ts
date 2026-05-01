export const buildLoginRedirectPath = (to: {
  path: string;
  fullPath?: string;
}) => {
  const destination = to.fullPath || to.path || "/";
  return `/login?redirect=${encodeURIComponent(destination)}`;
};
