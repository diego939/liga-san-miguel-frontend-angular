export interface Profesor {
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

export interface ProfesorPaginadoResponse {
  data: Profesor[];
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface MateriaProfesor {
  id: number;
  materia: string;
  idCurso: number;
  curso: string;
}

export interface CursoProfesor {
  idCurso: number;
  modulo: number;
  division: string;
  modalidad: string;
  turno: string;
  anio: number;
}

export interface AsignarProfesorRequest {
  idProfesor: number;
  idCursoMateria: number;
}
