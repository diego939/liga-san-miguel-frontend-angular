import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Rol,
  UsuarioActivarDesactivarRequest,
  UsuarioCrearRequest,
  UsuarioEditarRequest,
  UsuarioPaginadoResponse
} from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsuariosPaginados(page: number, pageSize: number, search: string, sortBy: string, sortDescending: boolean): Observable<UsuarioPaginadoResponse> {
    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDescending', sortDescending.toString());

    const response = this.http.get<UsuarioPaginadoResponse>(`${this.baseUrl}/api/Usuario/lista-paginado`, { params });
    return response;
  }

  crear(body: UsuarioCrearRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/api/Usuario/crear`, body);
  }

  editar(body: UsuarioEditarRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.baseUrl}/api/Usuario/editar`, body);
  }

  activar(body: UsuarioActivarDesactivarRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.baseUrl}/api/Usuario/activar`, body);
  }

  desactivar(body: UsuarioActivarDesactivarRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.baseUrl}/api/Usuario/desactivar`, body);
  }

  listarRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.baseUrl}/api/Usuario/listar-roles`);
  }
}
