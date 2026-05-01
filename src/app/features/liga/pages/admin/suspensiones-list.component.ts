import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Suspension } from '../../models/api.types';
import { SuspensionesApiService } from '../../services/suspensiones-api.service';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { apiErrorAlert } from '../../utils/api-error';
import { applySortClick } from '../../utils/column-sort.util';
import { fechaIsoADateInputValue } from '../../utils/date-format';

type EditarSuspensionPayload = { partidosRestantes: number } | { fechaHasta: string };

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
  sortBy: 'id' | 'partidosRestantes' | 'fechaHasta' = 'id';
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

  onSort(key: 'id' | 'partidosRestantes' | 'fechaHasta'): void {
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
    if (
      (by !== 'id' && by !== 'partidosRestantes' && by !== 'fechaHasta') ||
      (ord !== 'asc' && ord !== 'desc')
    ) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by as 'id' | 'partidosRestantes' | 'fechaHasta';
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

  private labelJugador(s: Suspension): string {
    const j = s.jugador;
    return j ? `${j.apellido}, ${j.nombre}` : `#${s.jugadorId}`;
  }

  async editarSuspension(s: Suspension): Promise<void> {
    const initialModo =
      s.fechaHasta != null && String(s.fechaHasta).trim() !== ''
        ? 'fecha'
        : 'partidos';
    const initialPartidos = String(
      s.partidosRestantes != null && s.partidosRestantes > 0
        ? s.partidosRestantes
        : 1,
    );
    const initialFecha = fechaIsoADateInputValue(s.fechaHasta);

    const result = await Swal.fire<EditarSuspensionPayload>({
      title: 'Editar vigencia de la suspensión',
      html:
        '<div class="text-left space-y-3">' +
        `<p class="text-sm text-gray-600">Suspensión #${s.id} · ${this.escapeHtml(this.labelJugador(s))}</p>` +
        '<p class="text-xs text-gray-500">Si elegís por partidos, la fecha se borra. Si elegís hasta fecha, los partidos restantes se borran. La fecha mostrada usa el día civil en la zona del sistema (Argentina), alineada con el API.</p>' +
        '<div>' +
        '<label for="edit-susp-modo" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Tipo de suspensión</label>' +
        '<select id="edit-susp-modo" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">' +
        '<option value="partidos">Por partidos</option>' +
        '<option value="fecha">Hasta fecha</option>' +
        '</select>' +
        '</div>' +
        '<div>' +
        '<label for="edit-susp-partidos" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Partidos restantes</label>' +
        '<input id="edit-susp-partidos" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" type="number" min="1" value="' +
        this.escapeHtml(initialPartidos) +
        '">' +
        '</div>' +
        '<div>' +
        '<label for="edit-susp-fecha" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Fecha hasta</label>' +
        '<input id="edit-susp-fecha" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" type="date" value="' +
        this.escapeHtml(initialFecha) +
        '">' +
        '</div>' +
        '</div>',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      width: 560,
      customClass: {
        popup: 'rounded-xl',
        title: 'text-lg font-semibold text-gray-900',
        confirmButton:
          'mx-1 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800',
        cancelButton:
          'mx-1 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50',
      },
      buttonsStyling: false,
      didOpen: () => {
        const modoEl = document.getElementById('edit-susp-modo') as HTMLSelectElement | null;
        const partidosEl = document.getElementById('edit-susp-partidos') as HTMLInputElement | null;
        const fechaEl = document.getElementById('edit-susp-fecha') as HTMLInputElement | null;
        if (modoEl) modoEl.value = initialModo;
        const updateVisibility = () => {
          const byPartidos = modoEl?.value === 'partidos';
          if (partidosEl) partidosEl.disabled = !byPartidos;
          if (fechaEl) fechaEl.disabled = byPartidos;
        };
        modoEl?.addEventListener('change', updateVisibility);
        updateVisibility();
      },
      preConfirm: () => {
        const mode = (document.getElementById('edit-susp-modo') as HTMLSelectElement | null)?.value;
        const partidosRaw = (document.getElementById('edit-susp-partidos') as HTMLInputElement | null)
          ?.value;
        const fechaRaw = (document.getElementById('edit-susp-fecha') as HTMLInputElement | null)?.value;
        if (mode === 'partidos') {
          const partidos = Number(partidosRaw);
          if (!Number.isInteger(partidos) || partidos < 1) {
            Swal.showValidationMessage('Ingresá una cantidad válida de partidos (mínimo 1).');
            return;
          }
          return { partidosRestantes: partidos };
        }
        if (!fechaRaw) {
          Swal.showValidationMessage('Seleccioná una fecha para la suspensión.');
          return;
        }
        return { fechaHasta: fechaRaw };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    const body =
      'partidosRestantes' in result.value
        ? { partidosRestantes: result.value.partidosRestantes }
        : { fechaHasta: result.value.fechaHasta };

    this.api.update(s.id, body).subscribe({
      next: () => {
        void Swal.fire({
          icon: 'success',
          title: 'Suspensión actualizada',
          timer: 1200,
          showConfirmButton: false,
        });
        this.load();
      },
      error: (e) => apiErrorAlert(e),
    });
  }

  /** Evita romper el HTML del modal si el nombre tiene caracteres especiales. */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
