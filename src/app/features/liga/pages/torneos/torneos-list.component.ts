import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Torneo } from '../../models/api.types';
import { TorneosApiService } from '../../services/torneos-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { apiErrorAlert } from '../../utils/api-error';
import { applySortClick } from '../../utils/column-sort.util';
import { formatDateOnly } from '../../utils/date-format';
import { ligaModal } from '../../shared/liga-ui';

@Component({
  selector: 'app-torneos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
  ],
  templateUrl: './torneos-list.component.html',
})
export class TorneosListComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly api = inject(TorneosApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  items: Torneo[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  loading = false;
  saving = false;
  filterQ = '';
  sortBy: 'nombre' | 'categoria' | 'formato' | 'fechaInicio' | 'fechaFin' | 'id' = 'fechaInicio';
  sortOrder: 'asc' | 'desc' = 'desc';
  modalOpen = false;
  editing: Torneo | null = null;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    categoria: ['', Validators.required],
    formato: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    limiteForaneos: [null as number | null],
    maxJugadores: [22, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .list({
        page: this.page,
        limit: this.limit,
        q: this.filterQ || undefined,
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

  apply(): void {
    this.page = 1;
    this.load();
  }

  onSort(key: 'nombre' | 'categoria' | 'formato' | 'fechaInicio' | 'fechaFin' | 'id'): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy as typeof this.sortBy;
    this.sortOrder = n.sortOrder;
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.editing = null;
    this.saving = false;
    this.form.reset({
      nombre: '',
      categoria: '',
      formato: '',
      fechaInicio: '',
      fechaFin: '',
      limiteForaneos: null,
      maxJugadores: 22,
    });
    this.modalOpen = true;
  }

  openEdit(t: Torneo, ev: Event): void {
    ev.stopPropagation();
    this.editing = t;
    this.saving = false;
    this.form.patchValue({
      nombre: t.nombre,
      categoria: t.categoria,
      formato: t.formato,
      fechaInicio: t.fechaInicio.slice(0, 10),
      fechaFin: t.fechaFin.slice(0, 10),
      limiteForaneos: t.limiteForaneos ?? null,
      maxJugadores: t.maxJugadores,
    });
    this.modalOpen = true;
  }

  close(): void {
    this.modalOpen = false;
    this.saving = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completá nombre, categoría, formato, fechas y máximo de jugadores.',
      });
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      nombre: v.nombre,
      categoria: v.categoria,
      formato: v.formato,
      fechaInicio: new Date(v.fechaInicio).toISOString(),
      fechaFin: new Date(v.fechaFin).toISOString(),
      limiteForaneos: v.limiteForaneos ?? undefined,
      maxJugadores: v.maxJugadores,
    };
    const req = this.editing ? this.api.update(this.editing.id, body) : this.api.create(body);
    this.saving = true;
    req.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
        this.close();
        this.load();
      },
      error: (e) => apiErrorAlert(e),
    });
  }

  gestionar(t: Torneo): void {
    void this.router.navigate(['/pages/torneos', t.id, 'equipos']);
  }

  formatDate = formatDateOnly;

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
