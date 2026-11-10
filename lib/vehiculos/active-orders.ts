export function filterVehiclesWithActiveOrders<
  Vehicle extends { id: string },
  Order extends { vehiculo_id: string },
>(vehicles: Vehicle[], activeOrders: Order[]) {
  const activeVehicleIds = new Set(activeOrders.map((order) => order.vehiculo_id));
  return vehicles.filter((vehicle) => activeVehicleIds.has(vehicle.id));
}
