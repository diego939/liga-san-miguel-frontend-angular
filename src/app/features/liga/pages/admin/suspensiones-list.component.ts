import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Suspension } from '../../models/api.types';
import { SuspensionesApiService } from '../../services/suspensiones-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';

@Component({
  selector: 'app-suspensiones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LigaPaginationComponent, LigaSortIndicatorComponent],
  templateUrl: './suspensiones-list.component.html',
})
export class SuspensionesListComponent implements OnInit {
  private readonly api = inject(SuspensionesApiService);
  items: Suspension[] = [];
  total = 0;
  page = 1;
  limit = 10;
  loading = false;
  soloActivas = true;
  sortBy: 'id' | 'partidosRestantes' = 'id';
  sortOrder: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .list({
        page: this.page,
        limit: this.limit,
        activas: this.soloActivas,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r) => {
          this.items = r.items;
          this.total = r.total;
        },
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
  }

  apply(): void {
    this.page = 1;
    this.load();
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: 'id' | 'partidosRestantes'): void {
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
    if ((by !== 'id' && by !== 'partidosRestantes') || (ord !== 'asc' && ord !== 'desc')) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by as 'id' | 'partidosRestantes';
    this.sortOrder = ord as 'asc' | 'desc';
    this.page = 1;
    this.load();
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
