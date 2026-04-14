export interface Curso {
  id: number;
  modulo: number;
  division: string;
  modalidad: string;
  turno: string;
  anio: number;
  cupoMaximo: number;
  fechaCreacion: Date | string;
}

export interface CursoPaginadoResponse {
  data: Curso[];
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CursoCrearRequest {
  modulo: number;
  division: string;
  modalidad: string;
  turno: string;
  anio: number;
  cupoMaximo: number;
}

export interface CursoEditarRequest {
  id: number;
  modulo: number;
  division: string;
  modalidad: string;
  turno: string;
  anio: number;
  cupoMaximo: number;
}