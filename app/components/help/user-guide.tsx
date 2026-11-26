"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  ClipboardList,
  Gauge,
  History,
  Image as ImageIcon,
  KeyRound,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import type { ProfileRole } from "@/lib/auth/permissions";

type PreviewKind =
  | "dashboard"
  | "orders"
  | "vehicle-form"
  | "order-form"
  | "order-detail"
  | "work"
  | "photos"
  | "notes"
  | "staff"
  | "history"
  | "account";

type GuideStep = {
  title: string;
  section: string;
  preview: PreviewKind;
  instructions: string[];
  tip: string;
};

const guides = {
  admin: {
    roleName: "Administrador",
    intro: "Configura el equipo y supervisa la operación completa del taller.",
    steps: [
      {
        title: "Empieza en el resumen del taller",
        section: "Dashboard",
        preview: "dashboard",
        instructions: [
          "Al entrar verás las órdenes activas, las que están listas para entrega y las que llevan varios días sin avance.",
          "Usa «Ver órdenes» para ir al trabajo pendiente. Los indicadores y gráficos se actualizan con la información registrada por el equipo.",
        ],
        tip: "Una alerta de seguimiento señala una orden activa sin cambios de estado durante tres días o más.",
      },
      {
        title: "Invita al personal y asigna su función",
        section: "Personal",
        preview: "staff",
        instructions: [
          "Abre «Personal» y completa nombre, correo y rol inicial: mecánico o recepcionista.",
          "Pulsa «Enviar invitación». La persona recibirá un enlace para activar su cuenta y crear una contraseña.",
          "En la lista del equipo puedes cambiar el rol, volver a enviar o cancelar invitaciones, y activar o desactivar cuentas.",
        ],
        tip: "Las cuentas de administrador están protegidas: desde esta pantalla no se cambia su rol.",
      },
      {
        title: "Registra el vehículo que ingresa",
        section: "Vehículos",
        preview: "vehicle-form",
        instructions: [
          "En «Vehículos», pulsa «Registrar vehículo». La placa, marca, modelo y año son datos obligatorios.",
          "Completa kilometraje y, si están disponibles, color, nombre y teléfono del propietario.",
          "Al guardar, la aplicación continúa al formulario para abrir la orden del vehículo.",
        ],
        tip: "La placa identifica al vehículo; verifica que esté escrita correctamente antes de guardar.",
      },
      {
        title: "Abre y asigna una orden de trabajo",
        section: "Nueva orden",
        preview: "order-form",
        instructions: [
          "Selecciona un vehículo, asigna un mecánico si corresponde y elige el tipo de servicio.",
          "Describe con claridad el motivo de ingreso. Puedes añadir una fecha estimada de entrega.",
          "Pulsa «Abrir orden». La aplicación crea la orden y te lleva a su detalle.",
        ],
        tip: "Un mecánico solo verá en su lista las órdenes que le fueron asignadas.",
      },
      {
        title: "Supervisa el avance y el historial",
        section: "Órdenes e historial",
        preview: "order-detail",
        instructions: [
          "En «Órdenes» busca por placa, cliente o número, o filtra por estado; abre una tarjeta para ver el detalle.",
          "Revisa el diagnóstico, trabajos realizados, fotografías por etapa, notas internas y el historial de estados.",
          "El flujo habitual es Recibido → Diagnóstico → Pendiente de aprobación → En reparación → Control de calidad → Listo para entrega → Entregado.",
          "Las órdenes entregadas, canceladas o archivadas se consultan desde «Historial».",
        ],
        tip: "Cancelar es una transición final permitida desde Pendiente de aprobación o Control de calidad. Añade el motivo solicitado.",
      },
    ],
  },
  mecanico: {
    roleName: "Mecánico",
    intro: "Consulta tus asignaciones, registra el trabajo y deja trazabilidad del avance.",
    steps: [
      {
        title: "Revisa el resumen del taller",
        section: "Dashboard",
        preview: "dashboard",
        instructions: [
          "El dashboard muestra los indicadores generales y las alertas de órdenes que requieren seguimiento.",
          "Pulsa «Ver órdenes» para consultar tus asignaciones y abrir una orden.",
        ],
        tip: "Tu lista de órdenes se limita a las que están asignadas a tu cuenta.",
      },
      {
        title: "Busca una orden asignada",
        section: "Órdenes",
        preview: "orders",
        instructions: [
          "En «Órdenes de trabajo», busca por placa, cliente o número de orden.",
          "Si la lista es extensa, selecciona un estado activo y pulsa «Buscar».",
          "Abre la tarjeta para consultar el vehículo, el servicio solicitado, las fechas y el personal asignado.",
        ],
        tip: "Las órdenes entregadas o canceladas dejan la lista activa y se conservan en el historial.",
      },
      {
        title: "Registra diagnóstico y avance",
        section: "Detalle de orden",
        preview: "order-detail",
        instructions: [
          "En «Seguimiento de la orden», elige solo uno de los próximos estados disponibles para tu rol.",
          "Añade el diagnóstico técnico antes de solicitar aprobación o pasar a control de calidad.",
          "Pulsa «Actualizar orden» para guardar. El cambio queda reflejado en el historial de estados.",
        ],
        tip: "Tus transiciones habituales son Recibido → Diagnóstico → Pendiente de aprobación y En reparación → Control de calidad. La aprobación y entrega corresponden a otros pasos del equipo.",
      },
      {
        title: "Desglosa y completa los trabajos",
        section: "Trabajos de la orden",
        preview: "work",
        instructions: [
          "Escribe la descripción de una tarea, selecciona su tipo y pulsa «Agregar trabajo».",
          "Marca la casilla de cada tarea al completarla. El equipo puede consultar el avance registrado.",
        ],
        tip: "Registra tareas concretas y comprensibles para que el historial de servicio sea útil.",
      },
      {
        title: "Adjunta evidencia y comunica novedades",
        section: "Fotos y notas internas",
        preview: "photos",
        instructions: [
          "En «Agregar fotografía», selecciona la etapa Entrada, Proceso o Salida, elige imágenes JPG, PNG o WebP de hasta 5 MB y pulsa «Subir fotografías».",
          "Puedes subir hasta seis imágenes por lote. Confirma que la etapa elegida coincida con el momento de la toma.",
          "Usa «Notas internas» para compartir una actualización con el personal autorizado.",
        ],
        tip: "Las fotografías son privadas. Para marcar una orden como entregada debe existir al menos una foto de salida.",
      },
    ],
  },
  recepcionista: {
    roleName: "Recepcionista",
    intro: "Registra ingresos, crea órdenes y completa la entrega al cliente.",
    steps: [
      {
        title: "Ubica vehículos y órdenes",
        section: "Dashboard y búsqueda",
        preview: "dashboard",
        instructions: [
          "El dashboard resume la operación y destaca órdenes activas que llevan varios días sin avance.",
          "En «Órdenes» busca por placa, cliente o número y usa el filtro de estado para reducir los resultados.",
          "En «Historial» busca un vehículo por placa o propietario para revisar servicios anteriores.",
        ],
        tip: "Las órdenes activas aparecen en Órdenes; las entregadas y canceladas se consultan desde el historial del vehículo.",
      },
      {
        title: "Registra un vehículo nuevo",
        section: "Vehículos",
        preview: "vehicle-form",
        instructions: [
          "Abre «Vehículos» y pulsa «Registrar vehículo». Completa placa, marca, modelo y año.",
          "Registra kilometraje y los datos de contacto disponibles del propietario.",
          "Pulsa «Guardar y abrir orden» para continuar directamente al ingreso del servicio.",
        ],
        tip: "Si el vehículo ya existe, búscalo primero por placa para evitar duplicarlo.",
      },
      {
        title: "Crea la orden de ingreso",
        section: "Nueva orden",
        preview: "order-form",
        instructions: [
          "Selecciona el vehículo y el mecánico responsable; la asignación puede quedar vacía si todavía no está definida.",
          "Elige el tipo de servicio, describe el motivo de ingreso y agrega una fecha estimada si se acordó.",
          "Pulsa «Abrir orden» y verifica los datos en la pantalla de detalle.",
        ],
        tip: "La orden empieza en estado Recibido y pasa a Diagnóstico cuando el equipo inicia la revisión.",
      },
      {
        title: "Da seguimiento al trabajo",
        section: "Órdenes y detalle",
        preview: "order-detail",
        instructions: [
          "Abre la orden para revisar su estado, el diagnóstico, las tareas, las fotografías y las notas del equipo.",
          "Los cambios de estado se guardan en la sección «Historial de estados». La aplicación actualiza la información sin que tengas que reconstruir la orden.",
          "Cuando el estado sea Listo para entrega, coordina la entrega real del vehículo al cliente.",
        ],
        tip: "No marques como entregado antes de devolver el vehículo. Debe haber una foto de salida y no pueden quedar otras órdenes activas para ese vehículo.",
      },
      {
        title: "Registra la entrega y consulta servicios anteriores",
        section: "Entrega e historial",
        preview: "history",
        instructions: [
          "En el detalle, selecciona «Entregado al cliente» únicamente después de la entrega física y pulsa «Actualizar orden».",
          "Si la aplicación indica que hay otras órdenes activas, resuélvelas antes de registrar la entrega.",
          "Para consultar trabajos cerrados, fotos y fechas anteriores, abre «Historial», busca el vehículo y entra a su registro.",
        ],
        tip: "El historial conserva órdenes entregadas, canceladas y archivadas; cerrar una orden no elimina el registro del vehículo.",
      },
    ],
  },
} satisfies Record<
  ProfileRole,
  { roleName: string; intro: string; steps: GuideStep[] }
>;

const previewTitles: Record<PreviewKind, string> = {
  dashboard: "Resumen operativo",
  orders: "Órdenes de trabajo",
  "vehicle-form": "Registrar vehículo",
  "order-form": "Abrir orden de trabajo",
  "order-detail": "Detalle y seguimiento",
  work: "Trabajos de la orden",
  photos: "Fotografías de la orden",
  notes: "Comunicación del equipo",
  staff: "Equipo del taller",
  history: "Historial por vehículo",
  account: "Ajustes de la cuenta",
};

function ReferenceScreenshot({ kind }: { kind: PreviewKind }) {
  return (
    <div
      aria-label={`Vista de referencia: ${previewTitles[kind]}`}
      className="overflow-hidden rounded-xl border border-line bg-white shadow-sm"
      role="img"
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-background px-3 py-2">
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        <span className="ml-2 truncate text-[10px] text-muted">
          SAMJU Talleres / {previewTitles[kind]}
        </span>
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
              {kind === "dashboard" ? "Resumen operativo" : "SAMJU · Talleres"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">
              {previewTitles[kind]}
            </p>
          </div>
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist text-ink">
            {kind === "dashboard" ? <Gauge size={14} /> :
              kind === "history" ? <History size={14} /> :
                kind === "staff" ? <UsersRound size={14} /> :
                  kind === "photos" ? <ImageIcon size={14} /> :
                    kind === "notes" ? <MessageSquareText size={14} /> :
                      kind === "account" ? <Settings size={14} /> :
                        kind === "orders" || kind === "order-detail" || kind === "work" || kind === "order-form"
                          ? <ClipboardList size={14} />
                          : <Wrench size={14} />}
          </span>
        </div>

        {kind === "dashboard" && (
          <div className="grid grid-cols-3 gap-2">
            {["Órdenes activas", "Listas para entrega", "Seguimiento"].map((item) => (
              <div className="rounded-lg border border-line p-2" key={item}>
                <span className="block h-1.5 w-8 rounded bg-mist" />
                <p className="mt-2 text-[9px] leading-3 text-muted">{item}</p>
              </div>
            ))}
            <div className="col-span-3 rounded-lg border border-line p-2">
              <p className="text-[9px] font-semibold text-ink">Alertas de seguimiento</p>
              <span className="mt-2 block h-2 w-4/5 rounded bg-mist" />
            </div>
          </div>
        )}

        {kind === "orders" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="h-7 flex-1 rounded-md border border-line bg-background" />
              <span className="h-7 w-20 rounded-md border border-line bg-background" />
              <span className="rounded-md bg-primary px-2 py-1.5 text-[9px] text-white">Buscar</span>
            </div>
            {["ABC-123 · Diagnóstico", "XYZ-456 · En reparación"].map((item) => (
              <div className="flex items-center justify-between rounded-lg border border-line p-2" key={item}>
                <span className="text-[10px] font-medium text-ink">{item}</span>
                <ArrowRight className="text-muted" size={12} />
              </div>
            ))}
          </div>
        )}

        {kind === "vehicle-form" && (
          <div className="grid grid-cols-2 gap-2">
            {["Placa *", "Marca *", "Modelo *", "Año *", "Kilometraje", "Propietario"].map((item) => (
              <div key={item}>
                <p className="mb-1 text-[9px] text-muted">{item}</p>
                <span className="block h-7 rounded-md border border-line bg-background" />
              </div>
            ))}
            <span className="col-span-2 rounded-md bg-primary px-3 py-2 text-center text-[9px] font-medium text-white">
              Guardar y abrir orden
            </span>
          </div>
        )}

        {kind === "order-form" && (
          <div className="space-y-2">
            {["Vehículo *", "Mecánico asignado", "Tipo de servicio *", "Motivo de ingreso *"].map((item) => (
              <div key={item}>
                <p className="mb-1 text-[9px] text-muted">{item}</p>
                <span className={`block rounded-md border border-line bg-background ${item.startsWith("Motivo") ? "h-10" : "h-6"}`} />
              </div>
            ))}
            <span className="inline-flex rounded-md bg-primary px-3 py-1.5 text-[9px] font-medium text-white">Abrir orden</span>
          </div>
        )}

        {kind === "order-detail" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-line p-2">
              <p className="text-[9px] font-semibold text-ink">Vehículo · ABC-123</p>
              <span className="mt-1 block h-1.5 w-3/4 rounded bg-mist" />
            </div>
            <div className="rounded-lg border border-line p-2">
              <p className="text-[9px] font-semibold text-ink">Seguimiento de la orden</p>
              <span className="mt-2 block h-6 rounded-md border border-line bg-background" />
              <span className="mt-2 inline-flex rounded-md bg-primary px-2 py-1 text-[9px] text-white">Actualizar orden</span>
            </div>
            <p className="text-center text-[9px] text-muted">Recibido → Diagnóstico → Reparación → Entrega</p>
          </div>
        )}

        {kind === "work" && (
          <div className="space-y-2">
            {["Inspeccionar sistema", "Reemplazar componente"].map((item, index) => (
              <div className="flex items-center gap-2 rounded-md border border-line p-2" key={item}>
                <span className={`grid size-3.5 place-items-center rounded border ${index === 0 ? "border-primary bg-primary text-white" : "border-line"}`}>
                  {index === 0 && <Check size={10} />}
                </span>
                <span className="text-[9px] text-ink">{item}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <span className="h-6 flex-1 rounded-md border border-line bg-background" />
              <span className="rounded-md bg-primary px-2 py-1.5 text-[9px] text-white">Agregar trabajo</span>
            </div>
          </div>
        )}

        {kind === "photos" && (
          <div className="space-y-2 rounded-lg border border-line p-2">
            <p className="text-[9px] font-semibold text-ink">Agregar fotografía</p>
            <div className="grid grid-cols-3 gap-1.5">
              {["Entrada", "Proceso", "Salida"].map((stage) => (
                <span className="rounded-md border border-line bg-background px-1 py-1.5 text-center text-[9px] text-muted" key={stage}>{stage}</span>
              ))}
            </div>
            <span className="block h-8 rounded-md border border-dashed border-line bg-background" />
            <span className="inline-flex rounded-md bg-primary px-2 py-1.5 text-[9px] text-white">Subir fotografías</span>
          </div>
        )}

        {kind === "notes" && (
          <div className="space-y-2">
            <div className="h-14 rounded-lg border border-line bg-background p-2">
              <span className="block h-1.5 w-3/4 rounded bg-mist" />
              <span className="mt-2 block h-1.5 w-1/2 rounded bg-mist" />
            </div>
            <span className="inline-flex rounded-md bg-primary px-2 py-1.5 text-[9px] text-white">Publicar nota</span>
            <div className="rounded-lg border border-line p-2 text-[9px] text-muted">Actividad del equipo</div>
          </div>
        )}

        {kind === "staff" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {["Nombre completo", "Correo electrónico", "Rol inicial"].map((item) => (
                <div key={item}>
                  <p className="mb-1 text-[9px] text-muted">{item}</p>
                  <span className="block h-6 rounded-md border border-line bg-background" />
                </div>
              ))}
              <span className="self-end rounded-md bg-primary px-2 py-1.5 text-center text-[9px] text-white">Enviar invitación</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line p-2 text-[9px] text-ink">
              <ShieldCheck size={12} /> Equipo del taller · roles y estado
            </div>
          </div>
        )}

        {kind === "history" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="h-7 flex-1 rounded-md border border-line bg-background" />
              <span className="rounded-md bg-primary px-2 py-1.5 text-[9px] text-white">Buscar</span>
            </div>
            {["Vehículo · ABC-123", "Servicio cerrado · Entregado"].map((item) => (
              <div className="rounded-lg border border-line p-2 text-[9px] text-ink" key={item}>{item}</div>
            ))}
          </div>
        )}

        {kind === "account" && (
          <div className="space-y-2">
            {["Perfil y foto", "Cambiar contraseña", "Apariencia"].map((item) => (
              <div className="flex items-center justify-between rounded-lg border border-line p-2 text-[9px] text-ink" key={item}>
                {item}<KeyRound size={12} className="text-muted" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function UserGuide({
  role,
  userId,
}: {
  role: ProfileRole;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const storageKey = `samju-user-guide:v1:${userId}`;
  const guide = guides[role];
  const step = guide.steps[stepIndex];
  const isLastStep = stepIndex === guide.steps.length - 1;
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);
  const hasCompletedGuide = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(storageKey) === "completed",
    () => true,
  );
  const isOpen = open || (!hasCompletedGuide && !dismissed);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(storageKey, "completed");
    setOpen(false);
    setDismissed(true);
  }, [storageKey]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [dismiss, isOpen]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [stepIndex]);

  function openGuide() {
    setStepIndex(0);
    setDismissed(false);
    setOpen(true);
  }

  function goNext() {
    if (isLastStep) {
      dismiss();
    } else {
      setStepIndex((current) => current + 1);
    }
  }

  return (
    <>
      <button
        aria-label="Abrir manual de usuario"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 grid size-12 place-items-center rounded-full border border-white/80 bg-primary text-white shadow-[0_8px_24px_-8px_rgba(27,54,42,0.65)] transition hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:left-6"
        onClick={openGuide}
        title="Manual de usuario"
        type="button"
      >
        <CircleHelp aria-hidden="true" size={22} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismiss();
          }}
        >
          <section
            aria-labelledby="user-guide-title"
            aria-modal="true"
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-background shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-white px-4 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-ink">
                  <BookOpen aria-hidden="true" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Manual de usuario · {guide.roleName}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-ink sm:text-xl" id="user-guide-title">
                    {step.title}
                  </h2>
                </div>
              </div>
              <button
                aria-label="Cerrar manual"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={dismiss}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
              <div className="hidden overflow-y-auto border-r border-line bg-white p-5 md:block lg:p-7">
                <p className="mb-4 text-xs leading-5 text-muted">{guide.intro}</p>
                <ol aria-label="Pasos del manual" className="space-y-1">
                  {guide.steps.map((item, index) => (
                    <li key={item.title}>
                      <button
                        aria-current={index === stepIndex ? "step" : undefined}
                        className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${index === stepIndex ? "bg-mist text-ink" : "text-muted hover:bg-background hover:text-ink"}`}
                        onClick={() => setStepIndex(index)}
                        type="button"
                      >
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${index === stepIndex ? "bg-primary text-white" : "bg-background text-muted"}`}>
                          {index < stepIndex ? <Check size={13} /> : index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">{item.section}</span>
                          <span className="mt-0.5 block text-sm font-medium leading-5">{item.title}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-7" ref={contentRef}>
                <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
                  <p className="text-xs font-medium text-muted">{guide.intro}</p>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink">
                    {stepIndex + 1} / {guide.steps.length}
                  </span>
                </div>
                <div className="mb-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] text-white">{stepIndex + 1}</span>
                    {step.section}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink">{step.instructions[0]}</p>
                </div>
                <div className="mb-5">
                  <ReferenceScreenshot kind={step.preview} />
                  <p className="mt-2 text-[10px] text-muted">
                    Vista ilustrativa de referencia. Los registros visibles dependen de los datos del taller.
                  </p>
                </div>
                <ol className="space-y-3">
                  {step.instructions.slice(1).map((instruction, index) => (
                    <li className="flex gap-3 text-sm leading-6 text-ink" key={instruction}>
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-muted">
                        {index + 2}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
                <aside className="mt-5 rounded-xl border border-line bg-white p-3.5">
                  <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <CircleHelp aria-hidden="true" size={15} />
                    Consejo
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-muted">{step.tip}</p>
                </aside>
              </div>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 sm:px-7 sm:py-4">
              <div className="flex items-center gap-2">
                <button
                  aria-label="Paso anterior"
                  className="grid size-10 place-items-center rounded-xl border border-line text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={17} />
                </button>
                <button
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-mist hover:text-ink"
                  onClick={dismiss}
                  type="button"
                >
                  Saltar guía
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-muted sm:inline">
                  Paso {stepIndex + 1} de {guide.steps.length}
                </span>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={goNext}
                  type="button"
                >
                  {isLastStep ? "Terminar guía" : "Siguiente"}
                  {isLastStep ? <Check aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={16} />}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
