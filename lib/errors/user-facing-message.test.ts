import { describe, expect, it } from "vitest";
import { getUserFacingErrorMessage } from "./user-facing-message";

describe("getUserFacingErrorMessage", () => {
  it("translates common authentication and storage errors", () => {
    expect(getUserFacingErrorMessage(new Error("Invalid login credentials"), "Error inesperado."))
      .toBe("El correo o la contraseña no son correctos.");
    expect(getUserFacingErrorMessage(new Error("new row violates row-level security policy"), "Error inesperado."))
      .toBe("No tienes permiso para realizar esta acción.");
  });

  it("preserves Spanish application errors", () => {
    expect(getUserFacingErrorMessage(new Error("La orden no se puede archivar todavía."), "Error inesperado."))
      .toBe("La orden no se puede archivar todavía.");
  });

  it("uses the Spanish fallback for unknown technical messages", () => {
    expect(getUserFacingErrorMessage(new Error("Internal server error"), "No se pudo completar la operación."))
      .toBe("No se pudo completar la operación.");
    expect(getUserFacingErrorMessage(new Error("Failed to upload vehículo.png"), "No se pudo subir la fotografía."))
      .toBe("No se pudo subir la fotografía.");
    expect(getUserFacingErrorMessage(null, "No se pudo completar la operación."))
      .toBe("No se pudo completar la operación.");
  });
});
