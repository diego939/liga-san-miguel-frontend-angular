import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { EquipoTorneo, EstadoPartido, Partido } from '../../models/api.types';
import { EquiposApiService } from '../../services/equipos-api.service';
import { PartidosApiService } from '../../services/partidos-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { formatDateTime } from '../../utils/date-format';
import { ligaModal } from '../../shared/liga-ui';
import { apiErrorAlert } from '../../utils/api-error';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-torneo-partidos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
    IfNotOperadorDirective,
  ],
  templateUrl: './torneo-partidos.component.html',
  styleUrls: ['./torneo-partidos.component.css'],
})
export class TorneoPartidosComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly partidosApi = inject(PartidosApiService);
  private readonly equiposApi = inject(EquiposApiService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  torneoId!: number;
  equipos: EquipoTorneo[] = [];
  items: Partido[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  loading = false;
  saving = false;
  estadoSavingId: number | null = null;
  readonly estadosPartido: EstadoPartido[] = ['PENDIENTE', 'EN_JUEGO', 'FINALIZADO'];
  sortBy: 'fecha' | 'estado' | 'id' = 'id';
  sortOrder: 'asc' | 'desc' = 'desc';
  modal = false;
  form = this.fb.nonNullable.group({
    equipoLocalId: [0, Validators.min(1)],
    equipoVisitanteId: [0, Validators.min(1)],
    fecha: ['', Validators.required],
  });

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.equiposApi.listByTorneo(this.torneoId).subscribe({
      next: (e) => (this.equipos = e),
      error: (err) => apiErrorAlert(err),
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.partidosApi
      .listByTorneo(this.torneoId, {
        page: this.page,
        limit: this.limit,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r) => {
          this.items = r.items;
          this.total = r.total;
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  openModal(): void {
    this.saving = false;
    this.form.reset({ equipoLocalId: 0, equipoVisitanteId: 0, fecha: '' });
    this.modal = true;
  }

  closeModal(): void {
    this.modal = false;
    this.saving = false;
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Elegí equipos local y visitante y la fecha del partido.',
      });
      return;
    }
    const v = this.form.getRawValue();
    if (v.equipoLocalId === v.equipoVisitanteId) {
      void Swal.fire('Equipos distintos', 'Local y visitante no pueden ser el mismo', 'warning');
      return;
    }
    this.saving = true;
    this.partidosApi
      .create(this.torneoId, {
        equipoLocalId: v.equipoLocalId,
        equipoVisitanteId: v.equipoVisitanteId,
        fecha: new Date(v.fecha).toISOString(),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Partido creado', timer: 1200, showConfirmButton: false });
          this.closeModal();
          this.load();
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  planilla(p: Partido): void {
    void this.router.navigate([
      '/pages/torneos',
      this.torneoId,
      'partidos',
      p.id,
      'planilla',
    ]);
  }

  marcador(p: Partido): string {
    const gl = p.golesLocal ?? 0;
    const gv = p.golesVisitante ?? 0;
    return `${gl} - ${gv}`;
  }

  labelEstado(e: EstadoPartido): string {
    const m: Record<EstadoPartido, string> = {
      PENDIENTE: 'Pendiente',
      EN_JUEGO: 'En juego',
      FINALIZADO: 'Finalizado',
    };
    return m[e] ?? e;
  }

  cambiarEstado(p: Partido, nuevo: EstadoPartido): void {
    if (nuevo === p.estado) return;
    this.estadoSavingId = p.id;
    this.partidosApi
      .updateEstado(p.id, { estado: nuevo })
      .pipe(finalize(() => (this.estadoSavingId = null)))
      .subscribe({
        next: (updated) => {
          const idx = this.items.findIndex((x) => x.id === p.id);
          if (idx >= 0) {
            this.items[idx] = { ...this.items[idx], ...updated };
          }
          Swal.fire({ icon: 'success', toast: true, position: 'top', title: 'Estado del partido cambiado correctamente', timer: 1200, showConfirmButton: false });
          this.load();
        },
        error: (e) => {
          void apiErrorAlert(e);
          this.load();
        },
      });
  }

  formatDt = formatDateTime;

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: 'fecha' | 'estado' | 'id'): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy as typeof this.sortBy;
    this.sortOrder = n.sortOrder;
    this.page = 1;
    this.load();
  }

  onSortSelect(value: string): void {
    const sep = value.indexOf(':');
    if (sep === -1) return;
    const by = value.slice(0, sep);
    const ord = value.slice(sep + 1);
    if ((by !== 'id' && by !== 'fecha' && by !== 'estado') || (ord !== 'asc' && ord !== 'desc')) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by as typeof this.sortBy;
    this.sortOrder = ord as 'asc' | 'desc';
    this.page = 1;
    this.load();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }
  nextPage(): void {
    if (this.page * this.limit < this.total) {
      this.page++;
      this.load();
    }
  }
}
