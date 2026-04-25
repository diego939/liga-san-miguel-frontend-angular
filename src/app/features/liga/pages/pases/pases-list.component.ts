import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Club, Jugador, Pase, TipoPase } from '../../models/api.types';
import { ClubesApiService } from '../../services/clubes-api.service';
import { JugadoresApiService } from '../../services/jugadores-api.service';
import { PasesApiService } from '../../services/pases-api.service';
import { labelEstadoPase } from '../../utils/pase-estado';
import { formatDateTime } from '../../utils/date-format';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { ligaModal } from '../../shared/liga-ui';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';

@Component({
  selector: 'app-pases-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
    IfNotOperadorDirective,
  ],
  templateUrl: './pases-list.component.html',
  styleUrl: './pases-list.component.css',
})
export class PasesListComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly pasesApi = inject(PasesApiService);
  private readonly clubesApi = inject(ClubesApiService);
  private readonly jugadoresApi = inject(JugadoresApiService);
  private readonly fb = inject(FormBuilder);

  items: Pase[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  /** Grilla de pases. */
  loading = false;
  /** Envío de modales (alta o renovación). */
  saving = false;
  clubs: Club[] = [];

  filterJugadorId: number | null = null;
  filterClubId: number | null = null;
  filterEstado: 'todos' | 'activo' | 'vencido' = 'todos';

  /** Modal nuevo pase: búsqueda por DNI */
  dniBusqueda = '';
  jugadorEncontrado: Jugador | null = null;
  buscandoJugador = false;

  sortBy: 'fechaInicio' | 'fechaFin' | 'id' = 'fechaInicio';
  sortOrder: 'asc' | 'desc' = 'desc';

  modalOpen = false;
  renewModal: Pase | null = null;

  form = this.fb.nonNullable.group({
    jugadorId: [0, Validators.required],
    clubOrigenId: [0],
    clubDestinoId: [0, Validators.required],
    tipo: ['DEFINITIVO' as TipoPase, Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
  });

  renewForm = this.fb.nonNullable.group({
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    tipo: ['DEFINITIVO' as TipoPase],
  });

  ngOnInit(): void {
    this.clubesApi.listAllForSelect().subscribe({
      next: (r) => (this.clubs = r.items),
      error: (e) => this.apiErrorAlert(e),
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.pasesApi
      .list({
        page: this.page,
        limit: this.limit,
        jugadorId: this.filterJugadorId ?? undefined,
        clubId: this.filterClubId ?? undefined,
        estado: this.filterEstado,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  onDniBusquedaChange(): void {
    this.jugadorEncontrado = null;
    this.form.patchValue({ jugadorId: 0, clubOrigenId: 0 });
  }

  buscarJugadorPorDni(): void {
    const dni = this.dniBusqueda.trim();
    if (!dni) {
      void Swal.fire({
        icon: 'info',
        title: 'Ingresá un DNI',
        text: 'Escribí el documento y tocá Buscar.',
      });
      return;
    }
    this.buscandoJugador = true;
    this.jugadoresApi
      .list({ dni, limit: 20, page: 1 })
      .pipe(finalize(() => (this.buscandoJugador = false)))
      .subscribe({
        next: (r) => {
          const dniNorm = dni.toLowerCase();
          const match = r.items.find((j) => j.dni.toLowerCase() === dniNorm);
          if (!match) {
            void Swal.fire({
              icon: 'warning',
              title: 'No se encontró el jugador',
              text: 'Ingresá el DNI completo y verificá que exista en el sistema.',
            });
            this.jugadorEncontrado = null;
            this.form.patchValue({ jugadorId: 0 });
            return;
          }
          this.jugadorEncontrado = match;
          this.form.patchValue({ jugadorId: match.id });
          this.autoselectClubOrigenFromPases(match.id);
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: 'fechaInicio' | 'fechaFin' | 'id'): void {
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
    if (
      (by !== 'id' && by !== 'fechaInicio' && by !== 'fechaFin') ||
      (ord !== 'asc' && ord !== 'desc')
    ) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by as 'fechaInicio' | 'fechaFin' | 'id';
    this.sortOrder = ord as 'asc' | 'desc';
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.renewModal = null;
    this.saving = false;
    this.dniBusqueda = '';
    this.jugadorEncontrado = null;
    this.form.reset({
      jugadorId: 0,
      clubOrigenId: 0,
      clubDestinoId: 0,
      tipo: 'DEFINITIVO',
      fechaInicio: '',
      fechaFin: '',
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.renewModal = null;
    this.saving = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completá club destino, fechas y tipo de pase. Buscá un jugador por DNI.',
      });
      return;
    }
    const v = this.form.getRawValue();
    if (!v.jugadorId || v.jugadorId <= 0) {
      void Swal.fire({
        icon: 'warning',
        title: 'Jugador requerido',
        text: 'Buscá un jugador por DNI antes de guardar.',
      });
      return;
    }
    if (v.tipo === 'TEMPORAL' && !v.fechaFin) {
      void Swal.fire({
        icon: 'warning',
        title: 'Fecha fin requerida',
        text: 'El pase temporal requiere fecha fin.',
      });
      return;
    }
    this.saving = true;
    this.pasesApi
      .create({
        jugadorId: v.jugadorId,
        clubOrigenId:
          v.clubOrigenId > 0 ? v.clubOrigenId : null,
        clubDestinoId: v.clubDestinoId,
        tipo: v.tipo,
        fechaInicio: new Date(v.fechaInicio).toISOString(),
        fechaFin: v.tipo === 'TEMPORAL' && v.fechaFin
          ? new Date(v.fechaFin).toISOString()
          : undefined,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Pase registrado', timer: 1200, showConfirmButton: false });
          this.closeModal();
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  openRenew(p: Pase): void {
    this.saving = false;
    this.renewModal = p;
    this.renewForm.patchValue({
      fechaInicio: this.toDateTimeLocalValue(new Date()),
      fechaFin: '',
      tipo: p.tipo,
    });
    this.modalOpen = true;
  }

  saveRenew(): void {
    if (!this.renewModal) return;
    if (this.renewForm.invalid) {
      this.renewForm.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completá fecha de inicio y el resto de los datos del pase.',
      });
      return;
    }
    const v = this.renewForm.getRawValue();
    if (v.tipo === 'TEMPORAL' && !v.fechaFin) {
      void Swal.fire({
        icon: 'warning',
        title: 'Fecha fin requerida',
        text: 'El pase temporal requiere fecha fin.',
      });
      return;
    }
    this.saving = true;
    this.pasesApi
      .renovar(this.renewModal.id, {
        fechaInicio: new Date(v.fechaInicio).toISOString(),
        fechaFin: v.fechaFin ? new Date(v.fechaFin).toISOString() : undefined,
        tipo: v.tipo,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Pase renovado', timer: 1200, showConfirmButton: false });
          this.closeModal();
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  labelEstado = labelEstadoPase;
  formatDt = formatDateTime;

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

  private apiErrorMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
    }
    const body = err.error;
    if (typeof body === 'string') {
      return body;
    }
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      if ('message' in o && o['message'] != null) {
        const m = o['message'];
        if (Array.isArray(m)) {
          return m.map(String).filter(Boolean).join('\n');
        }
        if (typeof m === 'string') {
          return m;
        }
      }
      try {
        return JSON.stringify(body);
      } catch {
        return String(body);
      }
    }
    if (body == null || body === '') {
      return '';
    }
    return String(body);
  }

  private apiErrorAlert(err: unknown): void {
    void Swal.fire({
      icon: 'error',
      text: this.apiErrorMessage(err),
    });
  }

  private autoselectClubOrigenFromPases(jugadorId: number): void {
    this.pasesApi
      .list({
        jugadorId,
        estado: 'activo',
        sortBy: 'fechaInicio',
        sortOrder: 'desc',
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (activos) => {
          const temporalActivo = activos.items.find((p) => p.tipo === 'TEMPORAL');
          if (temporalActivo?.clubDestinoId) {
            this.form.patchValue({ clubOrigenId: temporalActivo.clubDestinoId });
            return;
          }
          this.autoselectClubOrigenFromUltimoDefinitivo(jugadorId);
        },
        error: () => this.autoselectClubOrigenFromUltimoDefinitivo(jugadorId),
      });
  }

  private autoselectClubOrigenFromUltimoDefinitivo(jugadorId: number): void {
    this.pasesApi
      .list({
        jugadorId,
        estado: 'todos',
        sortBy: 'fechaInicio',
        sortOrder: 'desc',
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (todos) => {
          const ultimoDefinitivo = todos.items.find((p) => p.tipo === 'DEFINITIVO');
          this.form.patchValue({ clubOrigenId: ultimoDefinitivo?.clubDestinoId ?? 0 });
        },
        error: () => this.form.patchValue({ clubOrigenId: 0 }),
      });
  }

  private toDateTimeLocalValue(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }
}
