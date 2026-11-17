import { describe, expect, it } from "vitest";
import { canAccessPath } from "./permissions";

describe("canAccessPath", () => {
  it("allows every active role to visit the root redirect", () => {
    expect(canAccessPath("admin", "/")).toBe(true);
    expect(canAccessPath("mecanico", "/")).toBe(true);
    expect(canAccessPath("recepcionista", "/")).toBe(true);
  });
});
