import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type {
  GoleadorRow,
  TablaPosicionRow,
  TarjetasTorneoResponse,
} from '../../models/api.types';
import { EstadisticasApiService } from '../../services/estadisticas-api.service';
import { apiErrorAlert } from '../../utils/api-error';

@Component({
  selector: 'app-torneo-estadisticas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './torneo-estadisticas.component.html',
})
export class TorneoEstadisticasComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(EstadisticasApiService);

  torneoId!: number;
  tabla: TablaPosicionRow[] = [];
  goleadores: GoleadorRow[] = [];
  tarjetas: TarjetasTorneoResponse | null = null;
  loading = true;

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      tabla: this.api.tablaPosiciones(this.torneoId),
      goleadores: this.api.goleadores(this.torneoId),
      tarjetas: this.api.tarjetas(this.torneoId),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ tabla, goleadores, tarjetas }) => {
          this.tabla = tabla;
          this.goleadores = goleadores;
          this.tarjetas = tarjetas;
        },
        error: (e) => {
          this.tabla = [];
          this.goleadores = [];
          this.tarjetas = null;
          apiErrorAlert(e);
        },
      });
  }
}
