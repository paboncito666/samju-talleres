export function getVehicleServiceStatus(
  hasActiveOrders: boolean,
  hasDeliveredOrder: boolean,
) {
  if (hasActiveOrders) return "En proceso";
  if (hasDeliveredOrder) return "Entregado al cliente";
  return "Sin órdenes activas";
}
