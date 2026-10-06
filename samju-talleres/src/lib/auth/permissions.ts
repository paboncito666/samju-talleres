export const profileRoles = [
  "admin",
  "mecanico",
  "recepcionista",
] as const;

export type ProfileRole = (typeof profileRoles)[number];

const profileRoleSet: ReadonlySet<string> = new Set(profileRoles);

const routePermissions: Record<string, readonly ProfileRole[]> = {
  "/dashboard": profileRoles,
  "/vehiculos": ["admin", "recepcionista"],
  "/ordenes": profileRoles,
  "/historial": profileRoles,
};

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function canAccessPath(role: ProfileRole, pathname: string): boolean {
  const matchedRoute = Object.keys(routePermissions).find((route) =>
    matchesRoute(pathname, route),
  );

  if (!matchedRoute) {
    return false;
  }

  return routePermissions[matchedRoute].includes(role);
}

export function isProfileRole(value: unknown): value is ProfileRole {
  return typeof value === "string" && profileRoleSet.has(value);
}
