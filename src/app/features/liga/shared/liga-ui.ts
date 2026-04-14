/**
 * Clases reutilizables para modales y formularios (estilo Flowbite: focus rings, botones primary/secondary).
 */
export const ligaModal = {
  backdrop:
    'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
  backdropScroll:
    'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4',
  panelSm:
    'relative w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800',
  panelMd:
    'relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800',
  panelLg:
    'relative w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800',
  /** Modal ancho con margen vertical (listas largas) */
  panelLgScroll:
    'relative my-8 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800',
  title:
    'mb-4 text-xl font-semibold text-gray-900 dark:text-white',
  titleSm:
    'mb-4 text-lg font-semibold text-gray-900 dark:text-white',
  label:
    'mb-2 block text-sm font-medium text-gray-900 dark:text-gray-200',
  labelMuted:
    'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400',
  labelInline:
    'flex cursor-pointer items-center gap-2 text-sm text-gray-900 dark:text-gray-200',
  field:
    'block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500',
  btnPrimary:
    'inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800',
  btnSecondary:
    'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700',
  pickRow:
    'block w-full px-2 py-1 text-left text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-gray-600',
  checkbox:
    'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600',
} as const;
