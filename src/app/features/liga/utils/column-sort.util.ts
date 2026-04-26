/** Orden al activar una columna nueva (misma columna: se alterna asc/desc). */
export type SortOrder = 'asc' | 'desc';

export function defaultSortOrderForKey(key: string): SortOrder {
  switch (key) {
    case 'fechaInicio':
    case 'fechaFin':
    case 'createdAt':
      return 'desc';
    case 'fecha':
      return 'asc';
    case 'fechaNacimiento':
    case 'anioNacimiento':
      return 'asc';
    case 'id':
      return 'asc';
    case 'partidosRestantes':
      return 'desc';
    default:
      return 'asc';
  }
}

export function applySortClick(
  currentBy: string,
  currentOrder: SortOrder,
  clicked: string,
): { sortBy: string; sortOrder: SortOrder } {
  if (currentBy === clicked) {
    return {
      sortBy: clicked,
      sortOrder: currentOrder === 'asc' ? 'desc' : 'asc',
    };
  }
  return { sortBy: clicked, sortOrder: defaultSortOrderForKey(clicked) };
}
