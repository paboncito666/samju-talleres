import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.SEED_DEMO_CONFIRM !== "YES") {
  throw new Error(
    "Seed detenido. Configura SEED_DEMO_CONFIRM=YES para confirmar que quieres insertar datos de demostración.",
  );
}

if (!projectUrl || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
}

const parsedProjectUrl = new URL(projectUrl);
const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
  parsedProjectUrl.hostname,
);
if (parsedProjectUrl.protocol !== "https:" && !isLoopback) {
  throw new Error("La URL de Supabase debe usar HTTPS o apuntar a localhost.");
}

const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  {
    email: "admin.demo@samju.test",
    name: "Alex Administrador Demo",
    role: "admin",
  },
  {
    email: "mecanico.demo@samju.test",
    name: "Marco Mecánico Demo",
    role: "mecanico",
  },
  {
    email: "recepcion.demo@samju.test",
    name: "Rocío Recepción Demo",
    role: "recepcionista",
  },
];

const vehicleIds = {
  corolla: "d0000000-0000-4000-8000-000000000001",
  versa: "d0000000-0000-4000-8000-000000000002",
  frontier: "d0000000-0000-4000-8000-000000000003",
};

const orderIds = {
  delivered: "e0000000-0000-4000-8000-000000000001",
  repair: "e0000000-0000-4000-8000-000000000002",
  cancelled: "e0000000-0000-4000-8000-000000000003",
  received: "e0000000-0000-4000-8000-000000000004",
};

async function findAuthUserByEmail(email) {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new Error(`No se pudo buscar el usuario ${email}: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
}

async function ensureAuthUser({ email, name, password }) {
  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      },
    );
    if (error) {
      throw new Error(`No se pudo actualizar ${email}: ${error.message}`);
    }
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) {
    throw new Error(`No se pudo crear ${email}: ${error.message}`);
  }
  return data.user;
}

async function upsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    throw new Error(`No se pudieron insertar datos en ${table}: ${error.message}`);
  }
  console.log(`OK ${table}: ${rows.length} registro(s)`);
}

function generateDemoPassword() {
  return `Samju-${randomBytes(24).toString("base64url")}!7a`;
}

async function run() {
  console.log(`Insertando datos de demostración en ${parsedProjectUrl.host}`);
  console.log("No se borrarán datos existentes.");

  const profiles = [];
  for (const user of users) {
    const password = generateDemoPassword();
    const authUser = await ensureAuthUser({ ...user, password });
    console.log(`Cuenta demo ${user.role}: ${user.email} / ${password}`);
    profiles.push({
      id: authUser.id,
      nombre: user.name,
      rol: user.role,
      activo: true,
    });
  }

  await upsert("profiles", profiles);

  const profileByRole = Object.fromEntries(
    users.map((user, index) => [user.role, profiles[index].id]),
  );

  await upsert("vehiculos", [
    {
      id: vehicleIds.corolla,
      placa: "DEMO-01",
      marca: "Toyota",
      modelo: "Corolla",
      anio: 2020,
      color: "Gris",
      kilometraje: 58420,
      propietario_nombre: "Patricia Ejemplo",
      propietario_telefono: "5550000101",
    },
    {
      id: vehicleIds.versa,
      placa: "DEMO-02",
      marca: "Nissan",
      modelo: "Versa",
      anio: 2022,
      color: "Blanco",
      kilometraje: 31200,
      propietario_nombre: "Samuel Prueba",
      propietario_telefono: "5550000102",
    },
    {
      id: vehicleIds.frontier,
      placa: "DEMO-03",
      marca: "Nissan",
      modelo: "Frontier",
      anio: 2019,
      color: "Rojo",
      kilometraje: 76800,
      propietario_nombre: "Andrea Muestra",
      propietario_telefono: "5550000103",
    },
  ]);

  await upsert("ordenes_trabajo", [
    {
      id: orderIds.delivered,
      vehiculo_id: vehicleIds.corolla,
      mecanico_id: profileByRole.mecanico,
      recepcionista_id: profileByRole.recepcionista,
      estado: "ENTREGADO",
      descripcion_trabajo: "Servicio preventivo y cambio de aceite",
      tipo_servicio: "preventivo",
      fecha_ingreso: "2026-09-04T15:00:00.000Z",
      fecha_estimada_entrega: "2026-09-05",
      fecha_entrega_real: "2026-09-05T20:30:00.000Z",
      observaciones: "Se revisaron niveles y presión de neumáticos.",
    },
    {
      id: orderIds.repair,
      vehiculo_id: vehicleIds.versa,
      mecanico_id: profileByRole.mecanico,
      recepcionista_id: profileByRole.recepcionista,
      estado: "REPARACION",
      descripcion_trabajo: "Revisión de sistema de frenos",
      tipo_servicio: "mecanico",
      fecha_ingreso: "2026-10-02T14:00:00.000Z",
      fecha_estimada_entrega: "2026-10-08",
      observaciones: "Esperando confirmar desgaste de balatas.",
    },
    {
      id: orderIds.cancelled,
      vehiculo_id: vehicleIds.frontier,
      mecanico_id: null,
      recepcionista_id: profileByRole.recepcionista,
      estado: "CANCELADO",
      descripcion_trabajo: "Diagnóstico de falla eléctrica",
      tipo_servicio: "electrico",
      fecha_ingreso: "2026-08-10T16:00:00.000Z",
      fecha_estimada_entrega: "2026-08-12",
      motivo_cancelacion: "El cliente solicitó reagendar el servicio.",
    },
    {
      id: orderIds.received,
      vehiculo_id: vehicleIds.corolla,
      mecanico_id: null,
      recepcionista_id: profileByRole.recepcionista,
      estado: "RECIBIDO",
      descripcion_trabajo: "Inspección de suspensión delantera",
      tipo_servicio: "mecanico",
      fecha_ingreso: "2026-10-05T13:00:00.000Z",
      fecha_estimada_entrega: "2026-10-07",
    },
  ]);

  await upsert("trabajos_realizados", [
    {
      id: "f0000000-0000-4000-8000-000000000001",
      orden_id: orderIds.delivered,
      descripcion: "Cambio de aceite y filtro",
      tipo: "preventivo",
      completado: true,
      creado_en: "2026-09-05T17:00:00.000Z",
    },
    {
      id: "f0000000-0000-4000-8000-000000000002",
      orden_id: orderIds.delivered,
      descripcion: "Revisión de niveles y puntos de seguridad",
      tipo: "preventivo",
      completado: true,
      creado_en: "2026-09-05T18:00:00.000Z",
    },
    {
      id: "f0000000-0000-4000-8000-000000000003",
      orden_id: orderIds.repair,
      descripcion: "Inspección de balatas delanteras",
      tipo: "mecanico",
      completado: true,
      creado_en: "2026-10-03T15:00:00.000Z",
    },
  ]);

  await upsert("fotos_vehiculo", [
    {
      id: "a0000000-0000-4000-8000-000000000001",
      orden_id: orderIds.delivered,
      url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80",
      etapa: "entrada",
      subida_por: profileByRole.recepcionista,
      creado_en: "2026-09-04T15:10:00.000Z",
    },
    {
      id: "a0000000-0000-4000-8000-000000000002",
      orden_id: orderIds.delivered,
      url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
      etapa: "salida",
      subida_por: profileByRole.mecanico,
      creado_en: "2026-09-05T19:00:00.000Z",
    },
    {
      id: "a0000000-0000-4000-8000-000000000003",
      orden_id: orderIds.repair,
      url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80",
      etapa: "proceso",
      subida_por: profileByRole.mecanico,
      creado_en: "2026-10-03T15:15:00.000Z",
    },
  ]);

  await upsert("historial_estados", [
    {
      id: "b0000000-0000-4000-8000-000000000001",
      orden_id: orderIds.delivered,
      estado_anterior: "CALIDAD",
      estado_nuevo: "ENTREGADO",
      cambiado_por: profileByRole.recepcionista,
      motivo: "Unidad entregada al cliente.",
      creado_en: "2026-09-05T20:30:00.000Z",
    },
    {
      id: "b0000000-0000-4000-8000-000000000002",
      orden_id: orderIds.repair,
      estado_anterior: "PENDIENTE",
      estado_nuevo: "REPARACION",
      cambiado_por: profileByRole.mecanico,
      motivo: "Diagnóstico confirmado; inicia reparación.",
      creado_en: "2026-10-03T14:30:00.000Z",
    },
    {
      id: "b0000000-0000-4000-8000-000000000003",
      orden_id: orderIds.cancelled,
      estado_anterior: "DIAGNOSTICO",
      estado_nuevo: "CANCELADO",
      cambiado_por: profileByRole.recepcionista,
      motivo: "Servicio reagendado a solicitud del cliente.",
      creado_en: "2026-08-11T16:00:00.000Z",
    },
    {
      id: "b0000000-0000-4000-8000-000000000004",
      orden_id: orderIds.received,
      estado_anterior: null,
      estado_nuevo: "RECIBIDO",
      cambiado_por: profileByRole.recepcionista,
      motivo: "Orden creada para inspección inicial.",
      creado_en: "2026-10-05T13:00:00.000Z",
    },
  ]);

  await upsert("notas_internas", [
    {
      id: "c0000000-0000-4000-8000-000000000001",
      orden_id: orderIds.repair,
      autor_id: profileByRole.mecanico,
      contenido:
        "Prueba de nota interna: revisar el estado de las balatas antes de pedir repuestos.",
      creado_en: "2026-10-03T16:00:00.000Z",
    },
    {
      id: "c0000000-0000-4000-8000-000000000002",
      orden_id: orderIds.repair,
      autor_id: profileByRole.recepcionista,
      contenido:
        "Se informó al cliente que confirmaremos la fecha de entrega al terminar la inspección.",
      creado_en: "2026-10-03T17:00:00.000Z",
    },
  ]);

  console.log("\nSeed de demostración completado.");
  console.log(
    "\nSolo para desarrollo/pruebas. Cambia o elimina estos usuarios antes de usar el proyecto en producción.",
  );
}

run().catch((error) => {
  console.error("Falló el seed de demostración.");
  console.error(error);
  process.exitCode = 1;
});
