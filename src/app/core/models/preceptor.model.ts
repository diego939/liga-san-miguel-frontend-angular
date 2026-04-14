export interface Preceptor {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  rol: string;
  idRol: number | null;
  dni: string;
  urlImagen: string | null;
  token: string | null;
  fechaEliminacion: Date | string | null;
}

export interface PreceptorPaginadoResponse {
  data: Preceptor[];
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface PreceptorCurso {
  idCurso: number;
  modulo: number;
  division: string;
  modalidad: string;
  turno: string;
  anio: number;
}

export interface AsignarPreceptorRequest {
  idPreceptor: number;
  idCurso: number;
}
