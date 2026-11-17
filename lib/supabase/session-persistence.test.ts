import { describe, expect, it } from "vitest";
import {
  applySessionCookiePersistence,
  SUPABASE_SESSION_MAX_AGE,
} from "./session-persistence";

describe("applySessionCookiePersistence", () => {
  it("applies a persistent lifetime when remember-me is enabled", () => {
    const cookieWithMaxAge = { path: "/", maxAge: 60 };
    const cookieWithoutMaxAge = { path: "/" };

    expect(applySessionCookiePersistence(cookieWithMaxAge, true)).toEqual({
      path: "/",
      maxAge: SUPABASE_SESSION_MAX_AGE,
    });
    expect(applySessionCookiePersistence(cookieWithoutMaxAge, true)).toEqual({
      path: "/",
      maxAge: SUPABASE_SESSION_MAX_AGE,
    });
  });

  it("keeps session cookies temporary and preserves cookie deletion", () => {
    const cookieWithMaxAge = { path: "/", maxAge: 60 };
    const deletionCookie = { path: "/", maxAge: 0 };

    expect(applySessionCookiePersistence(cookieWithMaxAge, false)).toEqual({
      path: "/",
    });
    expect(applySessionCookiePersistence(deletionCookie, true)).toEqual({
      path: "/",
      maxAge: 0,
    });
  });
});
