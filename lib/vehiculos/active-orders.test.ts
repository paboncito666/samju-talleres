import { describe, expect, it } from "vitest";
import { filterVehiclesWithActiveOrders } from "./active-orders";

describe("vehicles shown in the workshop", () => {
  it("only keeps vehicles that have a matching active order", () => {
    const vehicles = [
      { id: "in-service", plate: "ABC-123" },
      { id: "delivered", plate: "DEF-456" },
      { id: "no-orders", plate: "GHI-789" },
    ];
    const activeOrders = [
      { id: "order-1", vehiculo_id: "in-service" },
      { id: "order-2", vehiculo_id: "in-service" },
    ];

    expect(filterVehiclesWithActiveOrders(vehicles, activeOrders)).toEqual([
      vehicles[0],
    ]);
  });
});
