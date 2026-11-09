import { describe, expect, it } from "vitest";
import { getVehicleServiceStatus } from "./status";

describe("vehicle service status", () => {
  it("keeps the vehicle in process while any order remains active", () => {
    expect(getVehicleServiceStatus(true, false)).toBe("En proceso");
    expect(getVehicleServiceStatus(true, true)).toBe("En proceso");
  });

  it("shows delivery only after a delivered order and no active orders remain", () => {
    expect(getVehicleServiceStatus(false, true)).toBe("Entregado al cliente");
    expect(getVehicleServiceStatus(false, false)).toBe("Sin órdenes activas");
  });
});
