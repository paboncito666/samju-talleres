"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applySessionCookiePersistence } from "@/lib/supabase/session-persistence";

let supabase: SupabaseClient | undefined;
let persistSession = true;

function getBrowserCookies() {
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separator = cookie.indexOf("=");
      return {
        name: cookie.slice(0, separator),
        value: cookie.slice(separator + 1),
      };
    });
}

function setBrowserCookie(name: string, value: string, options: Record<string, unknown>) {
  const cookieOptions = applySessionCookiePersistence(
    options as { maxAge?: number } & Record<string, unknown>,
    persistSession,
  );
  const attributes = [
    `Path=${typeof cookieOptions.path === "string" ? cookieOptions.path : "/"}`,
  ];
  if (typeof cookieOptions.domain === "string") {
    attributes.push(`Domain=${cookieOptions.domain}`);
  }
  if (typeof cookieOptions.maxAge === "number") {
    attributes.push(`Max-Age=${cookieOptions.maxAge}`);
  }
  if (cookieOptions.expires instanceof Date) {
    attributes.push(`Expires=${cookieOptions.expires.toUTCString()}`);
  }
  if (cookieOptions.sameSite) {
    attributes.push(`SameSite=${String(cookieOptions.sameSite)}`);
  }
  if (cookieOptions.secure || window.location.protocol === "https:") {
    attributes.push("Secure");
  }
  document.cookie = `${name}=${value}; ${attributes.join("; ")}`;
}

export function setSupabaseSessionPersistence(remember: boolean) {
  persistSession = remember;
  setBrowserCookie(
    "samju-remember-session",
    remember ? "1" : "0",
    applySessionCookiePersistence({}, remember),
  );
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const rememberCookie = getBrowserCookies().find(
    ({ name }) => name === "samju-remember-session",
  );
  persistSession = rememberCookie?.value !== "0";
  supabase ??= createBrowserClient(url, anonKey, {
    auth: {
      // Auth callback routes process URL tokens explicitly; avoid exchanging PKCE codes twice.
      detectSessionInUrl: false,
    },
    cookies: {
      getAll: getBrowserCookies,
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setBrowserCookie(name, value, options);
        });
      },
    },
  });
  return supabase;
}
