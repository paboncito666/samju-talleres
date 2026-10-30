import type { ProfileRole } from "@/lib/auth/permissions";
import {
  workOrderStatusTransitions,
  type WorkOrderStatus,
} from "@/lib/validations/api";

const mechanicTransitions: Partial<
  Record<WorkOrderStatus, readonly WorkOrderStatus[]>
> = {
  RECIBIDO: ["DIAGNOSTICO"],
  DIAGNOSTICO: ["PENDIENTE"],
  REPARACION: ["CALIDAD"],
};

const receptionistTransitions: Partial<
  Record<WorkOrderStatus, readonly WorkOrderStatus[]>
> = {
  LISTO: ["ENTREGADO"],
};

export function getAllowedOrderTransitions(
  role: ProfileRole,
  currentStatus: WorkOrderStatus,
): readonly WorkOrderStatus[] {
  const transitions =
    role === "admin"
      ? workOrderStatusTransitions[currentStatus]
      : role === "mecanico"
        ? mechanicTransitions[currentStatus] ?? []
        : receptionistTransitions[currentStatus] ?? [];

  return transitions;
}

export function canTransitionOrder(
  role: ProfileRole,
  currentStatus: WorkOrderStatus,
  nextStatus: WorkOrderStatus,
): boolean {
  return getAllowedOrderTransitions(role, currentStatus).includes(nextStatus);
}
