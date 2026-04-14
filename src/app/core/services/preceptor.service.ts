import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsignarPreceptorRequest,
  PreceptorCurso,
  PreceptorPaginadoResponse
} from '../models/preceptor.model';

@Injectable({
  providedIn: 'root'
})
export class PreceptorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPreceptoresPaginados(
    page: number,
    pageSize: number,
    search: string,
    sortBy: string,
    sortDescending: boolean
  ): Observable<PreceptorPaginadoResponse> {
    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDescending', sortDescending.toString());

    return this.http.get<PreceptorPaginadoResponse>(
      `${this.apiUrl}/api/Preceptor/lista-paginado`,
      { params }
    );
  }

  asignar(body: AsignarPreceptorRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/api/Preceptor/asignar`, body);
  }

  getCursosDelPreceptor(idPreceptor: number): Observable<PreceptorCurso[]> {
    return this.http.get<PreceptorCurso[]>(
      `${this.apiUrl}/api/Preceptor/${idPreceptor}/cursos`
    );
  }
}
