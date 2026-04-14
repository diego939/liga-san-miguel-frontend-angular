import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
  ],
  templateUrl: './usuarios-list.component.html',
})
export class UsuariosListComponent implements OnInit {
  readonly lm = ligaModal;

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
    this.rolesApi.list({ limit: 100, page: 1 }).subscribe((r) => (this.roles = r.items));
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
      error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ email: '', password: '', rolId: 0 });
    this.modal = true;
  }

  openEdit(u: Usuario): void {
    this.editing = u;
    this.form.patchValue({ email: u.email, password: '', rolId: u.rolId });
    this.modal = true;
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (!this.editing && (!v.password || v.password.length < 6)) {
      void Swal.fire('La contraseña debe tener al menos 6 caracteres', '', 'warning');
      return;
    }
    const req = this.editing
      ? this.api.update(this.editing.id, {
          email: v.email,
          rolId: v.rolId,
          ...(v.password ? { password: v.password } : {}),
        })
      : this.api.create({ email: v.email, password: v.password, rolId: v.rolId });
    req.subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
        this.modal = false;
        this.load();
      },
      error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
    });
  }

  onSort(key: 'email' | 'id' | 'rolId'): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy as typeof this.sortBy;
    this.sortOrder = n.sortOrder;
    this.page = 1;
    this.load();
  }

  remove(u: Usuario): void {
    void Swal.fire({ title: '¿Eliminar usuario?', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.delete(u.id).subscribe({
        next: () => this.load(),
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
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
}
