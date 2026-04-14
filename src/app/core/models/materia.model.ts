export interface Materia {
  id: number;
  descripcion: string;
  fechaCreacion: Date | string;
}

export interface MateriaPaginadoResponse {
  data: Materia[];
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
export interface CursoMateria {
  id: number;
  idCurso: number;
  idMateria: number;
  materia: string;
  fechaCreacion: Date | string;
}

export interface MateriaCrearRequest {
  descripcion: string;
}

export interface MateriaEditarRequest {
  id: number;
  descripcion: string;
}

export interface AsociarMateriaRequest {
  idCurso: number;
  idMateria: number;
}
