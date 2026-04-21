import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ClubesApiService } from '../../services/clubes-api.service';
import { JugadoresApiService } from '../../services/jugadores-api.service';
import type { Club, Jugador } from '../../models/api.types';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { formatDateOnly } from '../../utils/date-format';
import { ligaModal } from '../../shared/liga-ui';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';

@Component({
  selector: 'app-jugadores-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
    IfNotOperadorDirective,
  ],
  templateUrl: './jugadores-list.component.html',
})
export class JugadoresListComponent implements OnInit {
  private readonly api = inject(JugadoresApiService);
  private readonly clubesApi = inject(ClubesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly lm = ligaModal;

  clubs: Club[] = [];
  items: Jugador[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  /** Carga de la grilla. */
  loading = false;
  /** Envío del modal crear/editar. */
  saving = false;

  filterDni = '';
  filterQ = '';

  sortBy = 'apellido';
  sortOrder: 'asc' | 'desc' = 'asc';

  modalOpen = false;
  editing: Jugador | null = null;

  form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    telefono: [''],
    fechaNacimiento: ['', Validators.required],
    nacionalidad: [''],
    /** Solo alta: pase inicial con origen null. */
    clubDestinoInicialId: [0],
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
    this.api
      .list({
        page: this.page,
        limit: this.limit,
        dni: this.filterDni || undefined,
        q: this.filterQ || undefined,
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

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: string): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy;
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
      (by !== 'dni' && by !== 'apellido' && by !== 'nombre' && by !== 'fechaNacimiento') ||
      (ord !== 'asc' && ord !== 'desc')
    ) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by;
    this.sortOrder = ord;
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.editing = null;
    this.saving = false;
    this.form.reset({
      clubDestinoInicialId: 0,
    });
    this.modalOpen = true;
  }

  openEdit(j: Jugador, ev: Event): void {
    ev.stopPropagation();
    this.editing = j;
    this.saving = false;
    this.form.patchValue({
      dni: j.dni,
      nombre: j.nombre,
      apellido: j.apellido,
      telefono: j.telefono ?? '',
      fechaNacimiento: j.fechaNacimiento.slice(0, 10),
      nacionalidad: j.nacionalidad ?? '',
      clubDestinoInicialId: 0,
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.saving = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completá DNI, nombre, apellido y fecha de nacimiento.',
      });
      return;
    }
    const v = this.form.getRawValue();
    if (!this.editing) {
      if (!v.clubDestinoInicialId || v.clubDestinoInicialId <= 0) {
        void Swal.fire({
          icon: 'warning',
          title: 'Club requerido',
          text: 'Seleccioná el club de ingreso para registrar el pase inicial del jugador.',
        });
        return;
      }
    }
    const body = {
      dni: v.dni,
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono || undefined,
      fechaNacimiento: v.fechaNacimiento,
      nacionalidad: v.nacionalidad?.trim() || undefined,
    };
    const req = this.editing
      ? this.api.update(this.editing.id, body)
      : this.api.create({
          ...body,
          clubDestinoInicialId: v.clubDestinoInicialId,
        });
    this.saving = true;
    req
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
          this.closeModal();
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  remove(j: Jugador, ev: Event): void {
    ev.stopPropagation();
    void Swal.fire({
      title: '¿Eliminar jugador?',
      text: `${j.apellido}, ${j.nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.delete(j.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
    });
  }

  goDetail(j: Jugador): void {
    void this.router.navigate(['/pages/jugadores', j.id]);
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

  formatDate = formatDateOnly;

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
}
