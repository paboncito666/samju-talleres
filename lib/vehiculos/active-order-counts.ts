export function countActiveOrdersByVehicle(
  orders: { vehiculo_id: string }[],
) {
  const counts = new Map<string, number>();
  for (const order of orders) {
    counts.set(order.vehiculo_id, (counts.get(order.vehiculo_id) ?? 0) + 1);
  }
  return counts;
}
