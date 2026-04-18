/** Valor típico de `Rol.descripcion` en BD (seed). */
export const ROL_DESCRIPCION_OPERADOR = 'OPERADOR';

export function normalizarRolDescripcion(
  descripcion: string | undefined | null,
): string {
  return (descripcion ?? '').trim().toUpperCase();
}

export function esRolOperador(
  rolDescripcion: string | undefined | null,
): boolean {
  return normalizarRolDescripcion(rolDescripcion) === ROL_DESCRIPCION_OPERADOR;
}

/** Compara el rol actual con un texto esperado (misma regla que en BD, sin depender del id). */
export function esRol(
  rolDescripcion: string | undefined | null,
  rolEsperado: string,
): boolean {
  return (
    normalizarRolDescripcion(rolDescripcion) ===
    normalizarRolDescripcion(rolEsperado)
  );
}
