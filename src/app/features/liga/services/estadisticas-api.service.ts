import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  GoleadorRow,
  TablaPosicionRow,
  TarjetasTorneoResponse,
} from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class EstadisticasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/torneos`;

  tablaPosiciones(torneoId: number): Observable<TablaPosicionRow[]> {
    return this.http.get<TablaPosicionRow[]>(
      `${this.base}/${torneoId}/tabla-posiciones`,
    );
  }

  goleadores(torneoId: number): Observable<GoleadorRow[]> {
    return this.http.get<GoleadorRow[]>(`${this.base}/${torneoId}/goleadores`);
  }

  tarjetas(torneoId: number): Observable<TarjetasTorneoResponse> {
    return this.http.get<TarjetasTorneoResponse>(
      `${this.base}/${torneoId}/tarjetas`,
    );
  }
}
