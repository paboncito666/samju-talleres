import { describe, expect, it } from "vitest";
import { getRecoveryCallbackRedirect } from "./recovery-callback";

describe("getRecoveryCallbackRedirect", () => {
  it("sends recovery codes to the browser callback without dropping query parameters", () => {
    const redirect = getRecoveryCallbackRedirect(
      "https://samju.example/auth/callback?flow=recovery&code=one-time-code",
      "?flow=recovery&code=one-time-code&type=recovery",
    );

    expect(redirect?.pathname).toBe("/auth/callback/complete");
    expect(redirect?.searchParams.get("flow")).toBe("recovery");
    expect(redirect?.searchParams.get("code")).toBe("one-time-code");
    expect(redirect?.searchParams.get("type")).toBe("recovery");
  });

  it("leaves other authentication callbacks on the server callback", () => {
    expect(
      getRecoveryCallbackRedirect(
        "https://samju.example/auth/callback?code=oauth-code",
        "?code=oauth-code",
      ),
    ).toBeNull();
  });
});
