import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CursoEditarRequest,
  CursoCrearRequest,
  CursoPaginadoResponse
} from '../models/curso.model';
import { CursoMateria } from '../models/materia.model';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCursosPaginados(
    page: number,
    pageSize: number,
    search: string,
    sortBy: string,
    sortDescending: boolean
  ): Observable<CursoPaginadoResponse> {

    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDescending', sortDescending.toString());

    return this.http.get<CursoPaginadoResponse>(
      `${this.apiUrl}/api/Curso/lista-paginado`,
      { params }
    );
  }

  crear(body: CursoCrearRequest): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/api/Curso/crear`,
      body
    );
  }

  editar(body: CursoEditarRequest): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/api/Curso/editar`,
      body
    );
  }

  getMateriasPorCurso(idCurso: number): Observable<CursoMateria[]> {
    return this.http.get<CursoMateria[]>(
      `${this.apiUrl}/api/Materia/curso/${idCurso}`
    );
  }
}
