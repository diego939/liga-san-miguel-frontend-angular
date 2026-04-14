import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AsociarMateriaRequest,
  Materia,
  MateriaCrearRequest,
  MateriaEditarRequest,
  MateriaPaginadoResponse
} from '../models/materia.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MateriaService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) { }

  getMateriasPaginados(page: number, pageSize: number, search: string, sortBy: string, sortDescending: boolean): Observable<MateriaPaginadoResponse> {
    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDescending', sortDescending.toString());

    return this.http.get<MateriaPaginadoResponse>(`${this.apiUrl}/api/Materia/lista-paginado`, { params });
  }
  crear(body: MateriaCrearRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/api/Materia/crear`, body);
  }
  editar(body: MateriaEditarRequest): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/api/Materia/editar`, body);
  }

  getMateriasLista(): Observable<Materia[]> {
    return this.http.get<Materia[]>(`${this.apiUrl}/api/Materia/lista`);
  }

  asociar(body: AsociarMateriaRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/api/Materia/asociar`, body);
  }

  desasociar(idCurso: number, idMateria: number): Observable<unknown> {
    const body: AsociarMateriaRequest = { idCurso, idMateria };
    return this.http.post(`${this.apiUrl}/api/Materia/desasociar`, body);
  }
}
