import { describe, expect, it } from "vitest";
import { canTransitionOrder, getAllowedOrderTransitions } from "./workflow";

describe("order transition permissions", () => {
  it("allows administrators to use every valid transition", () => {
    expect(getAllowedOrderTransitions("admin", "DIAGNOSTICO")).toEqual([
      "PENDIENTE",
      "REPARACION",
    ]);
    expect(canTransitionOrder("admin", "PENDIENTE", "CANCELADO")).toBe(true);
    expect(canTransitionOrder("admin", "CALIDAD", "REPARACION")).toBe(true);
  });

  it("limits mechanics to workflow transitions on assigned orders", () => {
    expect(canTransitionOrder("mecanico", "RECIBIDO", "DIAGNOSTICO")).toBe(true);
    expect(canTransitionOrder("mecanico", "DIAGNOSTICO", "PENDIENTE")).toBe(true);
    expect(canTransitionOrder("mecanico", "REPARACION", "CALIDAD")).toBe(true);
    expect(canTransitionOrder("mecanico", "PENDIENTE", "REPARACION")).toBe(false);
    expect(canTransitionOrder("mecanico", "CALIDAD", "LISTO")).toBe(false);
    expect(canTransitionOrder("mecanico", "LISTO", "ENTREGADO")).toBe(false);
  });

  it("limits reception to completing delivery", () => {
    expect(canTransitionOrder("recepcionista", "LISTO", "ENTREGADO")).toBe(true);
    expect(canTransitionOrder("recepcionista", "RECIBIDO", "DIAGNOSTICO")).toBe(false);
    expect(canTransitionOrder("recepcionista", "PENDIENTE", "REPARACION")).toBe(false);
    expect(canTransitionOrder("recepcionista", "CALIDAD", "CANCELADO")).toBe(false);
  });

  it("rejects transitions outside the state graph for every role", () => {
    for (const role of ["admin", "mecanico", "recepcionista"] as const) {
      expect(canTransitionOrder(role, "DIAGNOSTICO", "CANCELADO")).toBe(false);
      expect(canTransitionOrder(role, "ENTREGADO", "REPARACION")).toBe(false);
    }
  });
});
