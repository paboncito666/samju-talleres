import { describe, expect, it } from "vitest";
import { countActiveOrdersByVehicle } from "./active-order-counts";

describe("active order counts by vehicle", () => {
  it("counts all active orders for each vehicle", () => {
    expect(
      countActiveOrdersByVehicle([
        { vehiculo_id: "vehicle-a" },
        { vehiculo_id: "vehicle-b" },
        { vehiculo_id: "vehicle-a" },
      ]),
    ).toEqual(
      new Map([
        ["vehicle-a", 2],
        ["vehicle-b", 1],
      ]),
    );
  });
});
