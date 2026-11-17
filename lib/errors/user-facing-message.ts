const translations: Array<[RegExp, string]> = [
  [/^invalid login credentials\.?$/i, "El correo o la contraseña no son correctos."],
  [/^email not confirmed\.?$/i, "Confirma tu correo electrónico antes de iniciar sesión."],
  [/^(user already registered|user already exists)\.?$/i, "Ya existe una cuenta con ese correo."],
  [/^user not found\.?$/i, "No se encontró una cuenta con ese correo."],
  [/^(email address is invalid|invalid email address)\.?$/i, "Ingresa un correo electrónico válido."],
  [/^new password should be different from the old password\.?$/i, "La nueva contraseña debe ser diferente de la actual."],
  [/^password should be at least \d+ characters?\.?$/i, "La contraseña no cumple los requisitos de longitud."],
  [/^(email rate limit exceeded|too many requests)\.?$/i, "Has solicitado demasiados correos o intentos. Espera un momento e inténtalo de nuevo."],
  [/^for security purposes, you can only request this after \d+ seconds?\.?$/i, "Espera un momento antes de volver a intentarlo."],
  [/^(token has expired or is invalid|otp has expired|invalid token|email link is invalid or has expired)\.?$/i, "El enlace expiró o ya no es válido. Solicita uno nuevo."],
  [/^(auth session missing|invalid refresh token.*|jwt expired|invalid jwt)\.?$/i, "Tu sesión expiró. Inicia sesión de nuevo."],
  [/^new row violates row-level security policy.*$/i, "No tienes permiso para realizar esta acción."],
  [/^(permission denied|unauthorized|user not allowed).*$/i, "No tienes permiso para realizar esta acción."],
  [/^(the resource already exists|object already exists).*$/i, "Ya existe un archivo con ese nombre."],
  [/^(object not found|the resource was not found|bucket not found).*$/i, "No se encontró el archivo solicitado."],
  [/^(payload too large|the object exceeded the maximum allowed size).*$/i, "El archivo supera el tamaño máximo permitido."],
  [/^(invalid mime type|the content type is not supported).*$/i, "El formato del archivo no es compatible."],
  [/^duplicate key value violates unique constraint.*$/i, "Ya existe un registro con esos datos."],
  [/^(network request failed|failed to fetch|fetch failed|load failed)$/i, "No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo."],
];

const spanishMessageStart =
  /^(no se\b|no puedo\b|no puedes\b|no pudo\b|no pudieron\b|no hay\b|no existe\b|no está\b|no están\b|ya existe\b|ya fue\b|el\b|la\b|los\b|las\b|tu\b|tus\b|debes\b|debe\b|puedes\b|selecciona\b|ingresa\b|usa\b|revisa\b|escribe\b|inicia sesión\b|configura\b|completa\b|verifica\b|ocurrió\b|correo\b|contraseña\b|invitación\b|datos\b|una\b|un\b|este\b|esta\b|se\b|hay\b|falta\b|faltan\b|por favor\b)/i;

function localizeMessage(message: string, fallback: string) {
  const normalized = message.trim();
  if (!normalized) return fallback;

  for (const [pattern, translation] of translations) {
    if (pattern.test(normalized)) return translation;
  }

  if (spanishMessageStart.test(normalized)) {
    return normalized;
  }

  return fallback;
}

export function getUserFacingErrorMessage(error: unknown, fallback: string) {
  return localizeMessage(
    error instanceof Error ? error.message : typeof error === "string" ? error : "",
    fallback,
  );
}
