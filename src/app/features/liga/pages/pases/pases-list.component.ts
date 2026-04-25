import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

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
  /** Mensaje bajo el campo DNI (vacío / no encontrado); sin alerta. */
  busquedaJugadorError: string | null = null;

  sortBy: 'fechaInicio' | 'fechaFin' | 'id' = 'fechaInicio';
  sortOrder: 'asc' | 'desc' = 'desc';

  modalOpen = false;
  renewModal: Pase | null = null;

  form = this.fb.nonNullable.group({
    jugadorId: [0, Validators.min(1)],
    clubOrigenId: [0],
    clubDestinoId: [0, Validators.min(1)],
    tipo: ['DEFINITIVO' as TipoPase, Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
  });

  renewForm = this.fb.nonNullable.group({
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    tipo: ['DEFINITIVO' as TipoPase, Validators.required],
  });

  ngOnInit(): void {
    this.clubesApi.listAllForSelect().subscribe({
      next: (r) => (this.clubs = r.items),
      error: (e) => this.apiErrorAlert(e),
    });
    this.load();
    this.form.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncCreateFechaFinValidators());
    this.renewForm.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncRenewFechaFinValidators());
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
    this.busquedaJugadorError = null;
    this.form.patchValue({ jugadorId: 0, clubOrigenId: 0 });
  }

  /** Solo permite dígitos (mismo criterio que el DNI en jugadores). */
  onDniKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const allowedKeys = new Set([
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
      'Enter',
    ]);
    if (allowedKeys.has(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Filtra pegados u otros caracteres no numéricos. */
  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const onlyDigits = input.value.replace(/\D+/g, '');
    if (input.value !== onlyDigits) {
      input.value = onlyDigits;
    }
    this.dniBusqueda = onlyDigits;
  }

  buscarJugadorPorDni(): void {
    const dni = this.dniBusqueda.trim();
    if (!dni) {
      this.busquedaJugadorError = 'Ingresá un DNI y tocá Buscar.';
      return;
    }
    this.busquedaJugadorError = null;
    this.buscandoJugador = true;
    this.jugadoresApi
      .list({ dni, limit: 20, page: 1 })
      .pipe(finalize(() => (this.buscandoJugador = false)))
      .subscribe({
        next: (r) => {
          const dniNorm = dni.toLowerCase();
          const match = r.items.find((j) => j.dni.toLowerCase() === dniNorm);
          if (!match) {
            this.busquedaJugadorError =
              'No se encontró un jugador con ese DNI.';
            this.jugadorEncontrado = null;
            this.form.patchValue({ jugadorId: 0 });
            return;
          }
          this.busquedaJugadorError = null;
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
    this.busquedaJugadorError = null;
    this.form.reset({
      jugadorId: 0,
      clubOrigenId: 0,
      clubDestinoId: 0,
      tipo: 'DEFINITIVO',
      fechaInicio: '',
      fechaFin: '',
    });
    this.syncCreateFechaFinValidators();
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.renewModal = null;
    this.saving = false;
  }

  save(): void {
    this.syncCreateFechaFinValidators();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
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
    this.syncRenewFechaFinValidators();
    this.modalOpen = true;
  }

  saveRenew(): void {
    if (!this.renewModal) return;
    this.syncRenewFechaFinValidators();
    if (this.renewForm.invalid) {
      this.renewForm.markAllAsTouched();
      return;
    }
    const v = this.renewForm.getRawValue();
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

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[controlName];
    return c.invalid && (c.dirty || c.touched);
  }

  isRenewInvalid(controlName: keyof typeof this.renewForm.controls): boolean {
    const c = this.renewForm.controls[controlName];
    return c.invalid && (c.dirty || c.touched);
  }

  private syncCreateFechaFinValidators(): void {
    const fin = this.form.controls.fechaFin;
    if (this.form.controls.tipo.value === 'TEMPORAL') {
      fin.setValidators([Validators.required]);
    } else {
      fin.clearValidators();
    }
    fin.updateValueAndValidity({ emitEvent: false });
  }

  private syncRenewFechaFinValidators(): void {
    const fin = this.renewForm.controls.fechaFin;
    if (this.renewForm.controls.tipo.value === 'TEMPORAL') {
      fin.setValidators([Validators.required]);
    } else {
      fin.clearValidators();
    }
    fin.updateValueAndValidity({ emitEvent: false });
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
