"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  const attributes = [`Path=${typeof options.path === "string" ? options.path : "/"}`];
  if (typeof options.domain === "string") attributes.push(`Domain=${options.domain}`);
  if (options.maxAge === 0) attributes.push("Max-Age=0");
  else if (persistSession && typeof options.maxAge === "number") {
    attributes.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires instanceof Date) {
    attributes.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.sameSite) attributes.push(`SameSite=${String(options.sameSite)}`);
  if (options.secure || window.location.protocol === "https:") attributes.push("Secure");
  document.cookie = `${name}=${value}; ${attributes.join("; ")}`;
}

export function setSupabaseSessionPersistence(remember: boolean) {
  persistSession = remember;
  setBrowserCookie(
    "samju-remember-session",
    remember ? "1" : "0",
    remember ? { maxAge: 400 * 24 * 60 * 60 } : {},
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
