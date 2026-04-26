import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Rol, Usuario } from '../../models/api.types';
import { RolesApiService } from '../../services/roles-api.service';
import { UsuariosApiService } from '../../services/usuarios-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { ligaModal } from '../../shared/liga-ui';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
  ],
  templateUrl: './usuarios-list.component.html',
})
export class UsuariosListComponent implements OnInit {
  readonly lm = ligaModal;

  loading = false;

  private readonly api = inject(UsuariosApiService);
  private readonly rolesApi = inject(RolesApiService);
  private readonly fb = inject(FormBuilder);

  items: Usuario[] = [];
  roles: Rol[] = [];
  total = 0;
  page = 1;
  limit = 10;
  sortBy: 'email' | 'id' | 'rolId' = 'email';
  sortOrder: 'asc' | 'desc' = 'asc';
  modal = false;
  editing: Usuario | null = null;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    rolId: [0, Validators.min(1)],
  });

  ngOnInit(): void {
    this.rolesApi
      .list({ limit: 100, page: 1 })
      .subscribe({
        next: (r) => (this.roles = r.items),
        error: (e) => this.apiErrorAlert(e),
      });
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

  openCreate(): void {
    this.editing = null;
    this.loading = false;
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    this.form.reset({ email: '', password: '', rolId: 0 });
    this.modal = true;
  }

  openEdit(u: Usuario): void {
    this.editing = u;
    this.loading = false;
    this.form.controls.password.setValidators([Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    this.form.patchValue({ email: u.email, password: '', rolId: u.rolId });
    this.modal = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const req = this.editing
      ? this.api.update(this.editing.id, {
          email: v.email,
          rolId: v.rolId,
          ...(v.password ? { password: v.password } : {}),
        })
      : this.api.create({ email: v.email, password: v.password, rolId: v.rolId });
    this.loading = true;
    req
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
          this.modal = false;
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: 'email' | 'id' | 'rolId'): void {
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
    if ((by !== 'email' && by !== 'id' && by !== 'rolId') || (ord !== 'asc' && ord !== 'desc')) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by as 'email' | 'id' | 'rolId';
    this.sortOrder = ord as 'asc' | 'desc';
    this.page = 1;
    this.load();
  }

  remove(u: Usuario): void {
    void Swal.fire({ title: '¿Eliminar usuario?', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.delete(u.id).subscribe({
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

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[controlName];
    return c.invalid && (c.touched || c.dirty);
  }

  /**
   * Mensaje tal como viene en el cuerpo de error HTTP (Nest: `message` string | string[],
   * cuerpo string, u objeto sin `message` → se serializa el cuerpo completo).
   * No usa el mensaje genérico de Angular (`Http failure response for…`).
   */
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

  /** Swal solo con el contenido emitido por el API (sin título fijo del front). */
  private apiErrorAlert(err: unknown): void {
    void Swal.fire({
      icon: 'error',
      text: this.apiErrorMessage(err),
    });
  }
}
