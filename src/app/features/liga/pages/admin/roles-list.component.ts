import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
    ReactiveFormsModule,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
  ],
  templateUrl: './roles-list.component.html',
})
export class RolesListComponent implements OnInit {
  readonly lm = ligaModal;

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
      error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
    });
  }

  onSort(key: 'id' | 'descripcion'): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy as typeof this.sortBy;
    this.sortOrder = n.sortOrder;
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.form.reset({ descripcion: '' });
    this.modal = true;
  }

  save(): void {
    if (this.form.invalid) return;
    this.api.create(this.form.getRawValue()).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Rol creado', timer: 1200, showConfirmButton: false });
        this.modal = false;
        this.load();
      },
      error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
    });
  }

  remove(r: Rol): void {
    void Swal.fire({ title: '¿Eliminar rol?', showCancelButton: true }).then((x) => {
      if (!x.isConfirmed) return;
      this.api.delete(r.id).subscribe({
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
