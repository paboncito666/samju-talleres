export const SUPABASE_SESSION_MAX_AGE = 400 * 24 * 60 * 60;

export function applySessionCookiePersistence<T extends object>(
  options: T & { maxAge?: number },
  persistSession: boolean,
): T & { maxAge?: number } {
  const cookieOptions = { ...options };

  if (cookieOptions.maxAge !== 0) {
    if (persistSession) {
      cookieOptions.maxAge = SUPABASE_SESSION_MAX_AGE;
    } else {
      delete cookieOptions.maxAge;
    }
  }

  return cookieOptions;
}
