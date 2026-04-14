import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { GoleadorRow, TablaPosicionRow } from '../../models/api.types';
import { EstadisticasApiService } from '../../services/estadisticas-api.service';

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
  loading = true;

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .tablaPosiciones(this.torneoId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (t) => (this.tabla = t),
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
    this.api.goleadores(this.torneoId).subscribe({
      next: (g) => (this.goleadores = g),
      error: () => {},
    });
  }
}
