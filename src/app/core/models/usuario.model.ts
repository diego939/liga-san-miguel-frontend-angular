export interface Usuario {
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
  /**
   * Baja lógica: `null` = usuario activo; con fecha = inactivo.
   * En JSON suele llegar como string ISO además de `Date`.
   */
  fechaEliminacion: Date | string | null;
}

export interface UsuarioPaginadoResponse {
  data: Usuario[];
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UsuarioCrearRequest {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono: string;
  dni: string;
  idRol: number;
}

export interface UsuarioEditarRequest {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  dni: string;
  idRol: number;
  urlImagen: string;
}

export interface UsuarioActivarDesactivarRequest {
  id: number;
}

export interface Rol {
  id: number;
  descripcion: string;
}