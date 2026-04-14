import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { EquipoTorneo } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class EquiposApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  listByTorneo(torneoId: number): Observable<EquipoTorneo[]> {
    return this.http.get<EquipoTorneo[]>(`${this.base}/torneos/${torneoId}/equipos`);
  }

  asociar(torneoId: number, body: { clubId: number }): Observable<EquipoTorneo> {
    return this.http.post<EquipoTorneo>(
      `${this.base}/torneos/${torneoId}/equipos`,
      body,
    );
  }

  get(id: number): Observable<EquipoTorneo> {
    return this.http.get<EquipoTorneo>(`${this.base}/equipos-torneo/${id}`);
  }

  resumen(id: number): Observable<{
    equipo: EquipoTorneo;
    inscripcionesActivas: number;
    foraneosActivos: number;
    maxJugadores: number;
  }> {
    return this.http.get(`${this.base}/equipos-torneo/${id}/resumen`) as Observable<{
      equipo: EquipoTorneo;
      inscripcionesActivas: number;
      foraneosActivos: number;
      maxJugadores: number;
    }>;
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/equipos-torneo/${id}`);
  }
}
