import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsignarProfesorRequest,
  CursoProfesor,
  MateriaProfesor,
  ProfesorPaginadoResponse
} from '../models/profesor.model';

@Injectable({
  providedIn: 'root'
})
export class ProfesorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfesoresPaginados(
    page: number,
    pageSize: number,
    search: string,
    sortBy: string,
    sortDescending: boolean
  ): Observable<ProfesorPaginadoResponse> {
    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDescending', sortDescending.toString());

    return this.http.get<ProfesorPaginadoResponse>(
      `${this.apiUrl}/api/Profesor/lista-paginado`,
      { params }
    );
  }

  asignar(body: AsignarProfesorRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/api/Profesor/asignar`, body);
  }

  getMateriasDelProfesor(idProfesor: number): Observable<MateriaProfesor[]> {
    return this.http.get<MateriaProfesor[]>(
      `${this.apiUrl}/api/Profesor/${idProfesor}/materias`
    );
  }

  getCursosDelProfesor(idProfesor: number): Observable<CursoProfesor[]> {
    return this.http.get<CursoProfesor[]>(
      `${this.apiUrl}/api/Profesor/${idProfesor}/cursos`
    );
  }
}
