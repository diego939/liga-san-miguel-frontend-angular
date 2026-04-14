import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { JugadoresApiService } from '../../services/jugadores-api.service';
import type { Inscripcion, Jugador, Pase, Suspension } from '../../models/api.types';
import { formatDateOnly, formatDateTime } from '../../utils/date-format';

@Component({
  selector: 'app-jugador-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './jugador-detail.component.html',
})
export class JugadorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(JugadoresApiService);

  id!: number;
  jugador: Jugador | null = null;
  pases: Pase[] = [];
  torneos: Inscripcion[] = [];
  suspensiones: Suspension[] = [];
  loading = true;
  tab: 'datos' | 'pases' | 'torneos' | 'susp' = 'datos';

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .get(this.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (j) => (this.jugador = j),
        error: () => (this.jugador = null),
      });
    this.api.listPases(this.id).subscribe((p) => (this.pases = p));
    this.api.listTorneosJugados(this.id).subscribe((t) => (this.torneos = t));
    this.api.listSuspensiones(this.id).subscribe((s) => (this.suspensiones = s));
  }

  setTab(t: typeof this.tab): void {
    this.tab = t;
  }

  formatDate = formatDateOnly;
  formatDt = formatDateTime;
}
