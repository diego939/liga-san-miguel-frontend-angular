import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Rol } from '../../models/api.types';
import { RolesApiService } from '../../services/roles-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { ligaModal } from '../../shared/liga-ui';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
  ],
  templateUrl: './roles-list.component.html',
})
export class RolesListComponent implements OnInit {
  readonly lm = ligaModal;

  loading = false;

  private readonly api = inject(RolesApiService);
  private readonly fb = inject(FormBuilder);

  items: Rol[] = [];
  total = 0;
  page = 1;
  limit = 10;
  sortBy: 'id' | 'descripcion' = 'id';
  sortOrder: 'asc' | 'desc' = 'asc';
  modal = false;
  form = this.fb.nonNullable.group({ descripcion: ['', Validators.required] });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api
      .list({ page: this.page, limit: this.limit, sortBy: this.sortBy, sortOrder: this.sortOrder })
      .subscribe({
      next: (r) => {
        this.items = r.items;
        this.total = r.total;
      },
      error: (e) => this.apiErrorAlert(e),
    });
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: 'id' | 'descripcion'): void {
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
    if ((by !== 'id' && by !== 'descripcion') || (ord !== 'asc' && ord !== 'desc')) {
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
    this.loading = false;
    this.form.reset({ descripcion: '' });
    this.modal = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Ingresá una descripción para el rol.',
      });
      return;
    }
    this.loading = true;
    this.api
      .create(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Rol creado', timer: 1200, showConfirmButton: false });
          this.modal = false;
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  remove(r: Rol): void {
    void Swal.fire({ title: '¿Eliminar rol?', showCancelButton: true }).then((x) => {
      if (!x.isConfirmed) return;
      this.api.delete(r.id).subscribe({
        next: () => this.load(),
        error: (e) => this.apiErrorAlert(e),
      });
    });
  }

  prev(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }
  next(): void {
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
}
