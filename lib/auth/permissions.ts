export const profileRoles = ["admin", "mecanico", "recepcionista"] as const;

export type ProfileRole = (typeof profileRoles)[number];

export function isProfileRole(value: unknown): value is ProfileRole {
  return (
    typeof value === "string" &&
    profileRoles.includes(value as ProfileRole)
  );
}

export function canAccessPath(role: ProfileRole, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }
  if (pathname.startsWith("/ajustes")) {
    return true;
  }
  if (pathname.startsWith("/vehiculos")) {
    return role === "admin" || role === "recepcionista";
  }
  return ["/dashboard", "/ordenes", "/historial"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function hasAnyRole(
  role: ProfileRole,
  allowedRoles: readonly ProfileRole[],
): boolean {
  return allowedRoles.includes(role);
}
