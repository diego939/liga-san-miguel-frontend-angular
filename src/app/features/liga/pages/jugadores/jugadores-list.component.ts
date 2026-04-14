import { CommonModule } from '@angular/common';
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
  loading = false;

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
    /** Solo alta: pase inicial con origen null. */
    clubDestinoInicialId: [0],
  });

  ngOnInit(): void {
    this.clubesApi.listAllForSelect().subscribe((r) => (this.clubs = r.items));
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
        error: (e) => this.toastError(e),
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  onSort(key: string): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy;
    this.sortOrder = n.sortOrder;
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({
      clubDestinoInicialId: 0,
    });
    this.modalOpen = true;
  }

  openEdit(j: Jugador, ev: Event): void {
    ev.stopPropagation();
    this.editing = j;
    this.form.patchValue({
      dni: j.dni,
      nombre: j.nombre,
      apellido: j.apellido,
      telefono: j.telefono ?? '',
      fechaNacimiento: j.fechaNacimiento.slice(0, 10),
      clubDestinoInicialId: 0,
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  save(): void {
    if (this.form.invalid) return;
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
    };
    const req = this.editing
      ? this.api.update(this.editing.id, body)
      : this.api.create({
          ...body,
          clubDestinoInicialId: v.clubDestinoInicialId,
        });
    req.subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        this.closeModal();
        this.load();
      },
      error: (e) => this.toastError(e),
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
        error: (e) => this.toastError(e),
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

  private toastError(err: { error?: { message?: string } }): void {
    const msg =
      err?.error?.message ??
      (typeof err?.error === 'string' ? err.error : 'Error de red');
    void Swal.fire({ icon: 'error', title: 'Error', text: String(msg) });
  }
}
