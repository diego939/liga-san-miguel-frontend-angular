import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-liga-sort-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngIf="active" class="ml-0.5 text-gray-500 dark:text-gray-400" aria-hidden="true">
      {{ order === 'asc' ? '▲' : '▼' }}
    </span>
  `,
})
export class LigaSortIndicatorComponent {
  @Input() active = false;
  @Input() order: 'asc' | 'desc' = 'asc';
}
