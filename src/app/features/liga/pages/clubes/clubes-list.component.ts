import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Club } from '../../models/api.types';
import { ClubesApiService } from '../../services/clubes-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { ligaModal } from '../../shared/liga-ui';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';

@Component({
  selector: 'app-clubes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
    IfNotOperadorDirective,
  ],
  templateUrl: './clubes-list.component.html',
})
export class ClubesListComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly api = inject(ClubesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  items: Club[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  loading = false;
  saving = false;
  filterQ = '';
  sortBy: 'nombre' | 'id' = 'nombre';
  sortOrder: 'asc' | 'desc' = 'asc';
  modalOpen = false;
  editing: Club | null = null;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    logo: [''],
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
        error: (e) => this.apiErrorAlert(e),
      });
  }

  apply(): void {
    this.page = 1;
    this.load();
  }

  onSort(key: 'nombre' | 'id'): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy as typeof this.sortBy;
    this.sortOrder = n.sortOrder;
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.editing = null;
    this.saving = false;
    this.form.reset({ nombre: '', logo: '' });
    this.modalOpen = true;
  }

  openEdit(c: Club, ev: Event): void {
    ev.stopPropagation();
    this.editing = c;
    this.saving = false;
    this.form.patchValue({ nombre: c.nombre, logo: c.logo ?? '' });
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
        text: 'Ingresá el nombre del club.',
      });
      return;
    }
    const v = this.form.getRawValue();
    const req = this.editing
      ? this.api.update(this.editing.id, { nombre: v.nombre, logo: v.logo || undefined })
      : this.api.create({ nombre: v.nombre, logo: v.logo || undefined });
    this.saving = true;
    req.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
        this.close();
        this.load();
      },
      error: (e) => this.apiErrorAlert(e),
    });
  }

  goDetail(c: Club): void {
    void this.router.navigate(['/pages/clubes', c.id]);
  }

  remove(c: Club, ev: Event): void {
    ev.stopPropagation();
    void Swal.fire({ title: '¿Eliminar club?', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.delete(c.id).subscribe({
        next: () => this.load(),
        error: (e) => this.apiErrorAlert(e),
      });
    });
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
}
