import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-liga-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4"
      aria-label="Paginación"
    >
      <span class="text-sm text-gray-700 dark:text-gray-400">
        Página {{ page }} de {{ totalPages }} · {{ total }} registros
      </span>
      <div class="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          (click)="prev.emit()"
          [disabled]="page <= 1"
          class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          type="button"
          (click)="next.emit()"
          [disabled]="page >= totalPages"
          class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-e-lg hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </nav>
  `,
})
export class LigaPaginationComponent {
  @Input({ required: true }) page!: number;
  @Input({ required: true }) total!: number;
  @Input({ required: true }) limit!: number;
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }
}
