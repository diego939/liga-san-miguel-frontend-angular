import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Inscripcion, Jugador } from '../../models/api.types';
import { InscripcionesApiService } from '../../services/inscripciones-api.service';
import { apiErrorAlert } from '../../utils/api-error';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { formatDateOnly } from '../../utils/date-format';
import { ligaModal } from '../../shared/liga-ui';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';

@Component({
  selector: 'app-torneo-inscripciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
    IfNotOperadorDirective,
  ],
  templateUrl: './torneo-inscripciones.component.html',
})
export class TorneoInscripcionesComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(InscripcionesApiService);
  torneoId!: number;
  equipoTorneoId!: number;

  clubNombre = '';
  torneoNombre = '';

  items: Inscripcion[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  loading = false;
  /** Guardado masivo en modal "Inscribir jugadores" */
  saving = false;
  /** Dar de baja masiva */
  bulkSaving = false;
  /** Baja individual en curso */
  cerrandoInsId: number | null = null;
  filterQ = '';
  soloActivas = true;

  /** Inscripciones activas seleccionables para baja masiva */
  selectedInsIds = new Set<number>();

  sortBy: 'apellido' | 'nombre' | 'dni' | 'fechaInicio' | 'id' = 'apellido';
  sortOrder: 'asc' | 'desc' = 'asc';

  modal = false;

  candidatos: Jugador[] = [];
  candidatosTotal = 0;
  candidPage = 1;
  readonly candidLimit = 50;
  loadingCandidatos = false;
  modalFiltroDni = '';
  modalFiltroQ = '';
  /** IDs de jugadores a inscribir (puede abarcar varias páginas del modal) */
  selectedCandIds = new Set<number>();
  /** Foráneo por jugador (checkbox en cada fila) */
  candForaneo = new Map<number, boolean>();

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.equipoTorneoId = Number(this.route.snapshot.paramMap.get('equipoTorneoId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .list(this.equipoTorneoId, {
        page: this.page,
        limit: this.limit,
        q: this.filterQ || undefined,
        soloActivas: this.soloActivas,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r) => {
          this.items = r.items;
          this.total = r.total;
          this.clubNombre = r.clubNombre;
          this.torneoNombre = r.torneoNombre;
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  apply(): void {
    this.page = 1;
    this.load();
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: 'apellido' | 'nombre' | 'dni' | 'fechaInicio' | 'id'): void {
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
      (by !== 'id' && by !== 'apellido' && by !== 'nombre' && by !== 'dni' && by !== 'fechaInicio') ||
      (ord !== 'asc' && ord !== 'desc')
    ) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by as typeof this.sortBy;
    this.sortOrder = ord as 'asc' | 'desc';
    this.page = 1;
    this.load();
  }

  formatFechaIns = formatDateOnly;

  trackJug = (_: number, j: Jugador) => j.id;

  /** Activas en la página actual */
  insActivasPagina(): Inscripcion[] {
    return this.items.filter((i) => !i.fechaFin);
  }

  toggleIns(id: number): void {
    const s = new Set(this.selectedInsIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.selectedInsIds = s;
  }

  insSeleccionada(id: number): boolean {
    return this.selectedInsIds.has(id);
  }

  todasActivasSeleccionadas(): boolean {
    const activas = this.insActivasPagina();
    return activas.length > 0 && activas.every((i) => this.selectedInsIds.has(i.id));
  }

  toggleTodasInsPagina(): void {
    const activas = this.insActivasPagina();
    if (this.todasActivasSeleccionadas()) {
      const s = new Set(this.selectedInsIds);
      for (const i of activas) s.delete(i.id);
      this.selectedInsIds = s;
    } else {
      const s = new Set(this.selectedInsIds);
      for (const i of activas) s.add(i.id);
      this.selectedInsIds = s;
    }
  }

  bulkQuitar(): void {
    const ids = [...this.selectedInsIds];
    const soloActivas = ids.filter((id) => {
      const ins = this.items.find((x) => x.id === id);
      return ins && !ins.fechaFin;
    });
    if (soloActivas.length === 0) {
      void Swal.fire('Seleccioná inscripciones activas', '', 'info');
      return;
    }
    void Swal.fire({
      title: `¿Dar de baja a ${soloActivas.length} jugador(es)?`,
      icon: 'warning',
      showCancelButton: true,
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.bulkSaving = true;
      this.api
        .cerrarBatch({ ids: soloActivas })
        .pipe(finalize(() => (this.bulkSaving = false)))
        .subscribe({
          next: (res) => {
            this.selectedInsIds = new Set();
            void Swal.fire({ icon: 'success', title: `${res.cerradas} baja(s)`, timer: 1200, showConfirmButton: false });
            this.load();
          },
          error: (e) => apiErrorAlert(e),
        });
    });
  }

  previewRow(ins: Inscripcion): void {
    this.api.preview(this.equipoTorneoId, ins.jugadorId).subscribe({
      next: (p) => {
        void Swal.fire(
          p.puede ? 'Pase válido' : 'Pase inválido',
          p.motivo ?? (p.puede ? 'OK para inscripción' : ''),
          p.puede ? 'success' : 'error',
        );
      },
      error: (e) => apiErrorAlert(e),
    });
  }

  openAdd(): void {
    this.saving = false;
    this.selectedCandIds = new Set();
    this.candForaneo = new Map();
    this.modalFiltroDni = '';
    this.modalFiltroQ = '';
    this.candidPage = 1;
    this.modal = true;
    this.loadCandidatos();
  }

  closeModal(): void {
    this.modal = false;
    this.saving = false;
  }

  loadCandidatos(): void {
    this.loadingCandidatos = true;
    this.api
      .listCandidatos(this.equipoTorneoId, {
        page: this.candidPage,
        limit: this.candidLimit,
        dni: this.modalFiltroDni.trim() || undefined,
        q: this.modalFiltroQ.trim() || undefined,
      })
      .pipe(finalize(() => (this.loadingCandidatos = false)))
      .subscribe({
        next: (r) => {
          this.candidatos = r.items;
          this.candidatosTotal = r.total;
          this.clubNombre = r.clubNombre;
          this.torneoNombre = r.torneoNombre;
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  aplicarFiltroCandidatos(): void {
    this.candidPage = 1;
    this.loadCandidatos();
  }

  toggleCand(id: number): void {
    const s = new Set(this.selectedCandIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.selectedCandIds = s;
  }

  candSeleccionado(id: number): boolean {
    return this.selectedCandIds.has(id);
  }

  toggleTodasCandPagina(): void {
    if (this.candidatosTodosSeleccionados()) {
      const s = new Set(this.selectedCandIds);
      for (const j of this.candidatos) s.delete(j.id);
      this.selectedCandIds = s;
    } else {
      const s = new Set(this.selectedCandIds);
      for (const j of this.candidatos) s.add(j.id);
      this.selectedCandIds = s;
    }
  }

  candidatosTodosSeleccionados(): boolean {
    return (
      this.candidatos.length > 0 &&
      this.candidatos.every((j) => this.selectedCandIds.has(j.id))
    );
  }

  foraneoCand(jid: number): boolean {
    return this.candForaneo.get(jid) ?? false;
  }

  setForaneoCand(jid: number, value: boolean): void {
    const m = new Map(this.candForaneo);
    m.set(jid, value);
    this.candForaneo = m;
  }

  onForaneoCandChange(jid: number, ev: Event): void {
    const t = ev.target as HTMLInputElement;
    this.setForaneoCand(jid, t.checked);
  }

  guardarLote(): void {
    const ids = [...this.selectedCandIds];
    if (ids.length === 0) {
      void Swal.fire('Seleccioná al menos un jugador', '', 'warning');
      return;
    }
    const items = ids.map((jugadorId) => ({
      jugadorId,
      esForaneo: this.candForaneo.get(jugadorId) ?? false,
    }));
    this.saving = true;
    this.api
      .createBatch(this.equipoTorneoId, { items })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Inscripciones registradas',
            timer: 1400,
            showConfirmButton: false,
          });
          this.closeModal();
          this.selectedCandIds = new Set();
          this.candForaneo = new Map();
          this.load();
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  quitar(ins: Inscripcion): void {
    if (ins.fechaFin) return;
    void Swal.fire({ title: '¿Dar de baja?', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.cerrandoInsId = ins.id;
      this.api
        .cerrar(ins.id)
        .pipe(finalize(() => (this.cerrandoInsId = null)))
        .subscribe({
          next: () => this.load(),
          error: (e) => apiErrorAlert(e),
        });
    });
  }

  estadoLabel(ins: Inscripcion): string {
    return ins.fechaFin ? 'Baja' : 'Activa';
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

  prevCandidPage(): void {
    if (this.candidPage > 1) {
      this.candidPage--;
      this.loadCandidatos();
    }
  }

  nextCandidPage(): void {
    if (this.candidPage * this.candidLimit < this.candidatosTotal) {
      this.candidPage++;
      this.loadCandidatos();
    }
  }

  countSeleccionInscribir(): number {
    return this.selectedCandIds.size;
  }

  countSeleccionBaja(): number {
    return this.selectedInsIds.size;
  }
}
