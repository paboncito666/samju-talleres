import { describe, expect, it } from "vitest";
import { isPendingStaffInvitation } from "./staff-invitations";

describe("isPendingStaffInvitation", () => {
  it("recognizes an invitation that has not been accepted", () => {
    expect(
      isPendingStaffInvitation({
        invited_at: "2026-11-12T12:00:00.000Z",
        email_confirmed_at: null,
        last_sign_in_at: null,
      }),
    ).toBe(true);
  });

  it("does not treat a confirmed or previously used account as pending", () => {
    expect(
      isPendingStaffInvitation({
        invited_at: "2026-11-12T12:00:00.000Z",
        email_confirmed_at: "2026-11-12T12:01:00.000Z",
        last_sign_in_at: null,
      }),
    ).toBe(false);
    expect(
      isPendingStaffInvitation({
        invited_at: "2026-11-12T12:00:00.000Z",
        email_confirmed_at: null,
        last_sign_in_at: "2026-11-12T12:01:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not treat ordinary accounts as pending invitations", () => {
    expect(isPendingStaffInvitation({})).toBe(false);
  });
});
