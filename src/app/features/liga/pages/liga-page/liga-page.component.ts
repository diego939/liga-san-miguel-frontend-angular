import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Pantalla mínima: enlaza después con servicios HTTP al API Nest. */
@Component({
  selector: 'app-liga-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-4xl">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {{ title }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Vista base. Conecta listados y formularios con los endpoints documentados en
        <code class="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">/docs</code>
        del backend (paginación: <code>page</code>, <code>limit</code>,
        <code>sortBy</code>, <code>sortOrder</code>).
      </p>
    </div>
  `,
})
export class LigaPageComponent {
  readonly title: string;

  constructor(private readonly route: ActivatedRoute) {
    let r = this.route;
    while (r.firstChild) {
      r = r.firstChild;
    }
    this.title =
      (r.snapshot.data['title'] as string) ?? 'Liga San Miguel';
  }
}
