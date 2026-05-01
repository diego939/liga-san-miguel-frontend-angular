import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type {
  CambioPartido,
  EstadoPartido,
  EventoPartido,
  Inscripcion,
  Jugador,
  Partido,
  TipoEvento,
} from '../../models/api.types';
import { environment } from '../../../../../environments/environment';
import { InscripcionesApiService } from '../../services/inscripciones-api.service';
import { PartidosApiService } from '../../services/partidos-api.service';
import { apiErrorAlert } from '../../utils/api-error';
import { inscripcionSolapaDiaCivil } from '../../utils/liga-day-bounds';

type Line = {
  jugadorId: number;
  titular: boolean;
  nombre?: string;
  dni?: string;
  numeroCamiseta?: number | null;
};
type SuspensionRojaPayload = { partidosRestantes?: number; fechaHasta?: string };

@Component({
  selector: 'app-planilla-partido',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './planilla-partido.component.html',
})
export class PlanillaPartidoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PartidosApiService);
  private readonly inscripcionesApi = inject(InscripcionesApiService);
  private readonly fb = inject(FormBuilder);

  torneoId!: number;
  partidoId!: number;
  partido: Partido | null = null;
  local: Line[] = [];
  visit: Line[] = [];
  inscriptosLocal: Inscripcion[] = [];
  inscriptosVis: Inscripcion[] = [];
  eventos: EventoPartido[] = [];
  cambios: CambioPartido[] = [];
  loading = true;
  saving = false;
  estadoSaving = false;
  readonly estadosPartido: EstadoPartido[] = ['PENDIENTE', 'EN_JUEGO', 'FINALIZADO'];

  capitanLocalJugadorId: number | null = null;
  capitanVisitanteJugadorId: number | null = null;
  arbitroPrincipal = '';
  juezLinea1 = '';
  juezLinea2 = '';
  observaciones = '';

  addLocalJugadorId: number | null = null;
  addVisJugadorId: number | null = null;
  /** Nº de camiseta elegido antes de pulsar Agregar (null = sin asignar). */
  addLocalNumeroCamiseta: number | null = null;
  addVisNumeroCamiseta: number | null = null;
  addLocalTitular = true;
  addVisTitular = true;

  readonly tiposEvento: TipoEvento[] = ['GOL', 'GOL_EN_CONTRA', 'AMARILLA', 'ROJA'];

  evForm = this.fb.nonNullable.group({
    jugadorId: [0, Validators.min(1)],
    tipo: ['GOL' as TipoEvento, Validators.required],
    minuto: [0, [Validators.required, Validators.min(0)]],
    notas: [''],
  });

  cambioForm = this.fb.nonNullable.group({
    equipo: ['local' as 'local' | 'vis', Validators.required],
    saleId: [0, Validators.min(1)],
    entraId: [0, Validators.min(1)],
    minuto: [0, Validators.required],
  });

  private readonly minutoMax = 130;

  constructor() {
    this.cambioForm
      .get('equipo')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.cambioForm.patchValue({ saleId: 0, entraId: 0 }, { emitEvent: false });
      });
  }

  ajustarMinutoEv(delta: number): void {
    const c = this.evForm.get('minuto');
    if (!c) return;
    const cur = Number(c.value) || 0;
    c.setValue(Math.max(0, Math.min(this.minutoMax, cur + delta)));
  }

  puedeDecrementarMinutoEv(): boolean {
    return (Number(this.evForm.get('minuto')?.value) || 0) > 0;
  }

  puedeIncrementarMinutoEv(): boolean {
    return (Number(this.evForm.get('minuto')?.value) || 0) < this.minutoMax;
  }

  ajustarMinutoCambio(delta: number): void {
    const c = this.cambioForm.get('minuto');
    if (!c) return;
    const cur = Number(c.value) || 0;
    c.setValue(Math.max(0, Math.min(this.minutoMax, cur + delta)));
  }

  puedeDecrementarMinutoCambio(): boolean {
    return (Number(this.cambioForm.get('minuto')?.value) || 0) > 0;
  }

  puedeIncrementarMinutoCambio(): boolean {
    return (Number(this.cambioForm.get('minuto')?.value) || 0) < this.minutoMax;
  }

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.partidoId = Number(this.route.snapshot.paramMap.get('partidoId'));
    this.reload();
  }

  /** Líneas de planilla del equipo elegido en el formulario de cambios. */
  lineasParaCambio(): Line[] {
    const eq = this.cambioForm.getRawValue().equipo;
    return this.lineasCambio(eq);
  }

  reload(): void {
    this.loading = true;
    this.api
      .get(this.partidoId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (p) => {
          this.partido = p;
          this.syncActaFromPartido(p);
          this.loadPlanilla();
          this.loadEventosCambios();
          this.loadInscriptos();
        },
        error: (e) => {
          this.partido = null;
          apiErrorAlert(e);
        },
      });
  }

  syncActaFromPartido(p: Partido): void {
    this.capitanLocalJugadorId = p.capitanLocalJugadorId ?? null;
    this.capitanVisitanteJugadorId = p.capitanVisitanteJugadorId ?? null;
    this.arbitroPrincipal = p.arbitroPrincipal ?? '';
    this.juezLinea1 = p.juezLinea1 ?? '';
    this.juezLinea2 = p.juezLinea2 ?? '';
    this.observaciones = p.observaciones ?? '';
  }

  loadInscriptos(): void {
    if (!this.partido) return;
    forkJoin({
      loc: this.inscripcionesApi.list(this.partido.equipoLocalId, {
        soloActivas: true,
        limit: 100,
        page: 1,
        sortBy: 'apellido',
      }),
      vis: this.inscripcionesApi.list(this.partido.equipoVisitanteId, {
        soloActivas: true,
        limit: 100,
        page: 1,
        sortBy: 'apellido',
      }),
    }).subscribe({
      next: ({ loc, vis }) => {
        this.inscriptosLocal = loc.items;
        this.inscriptosVis = vis.items;
      },
      error: (e) => {
        this.inscriptosLocal = [];
        this.inscriptosVis = [];
        apiErrorAlert(e);
      },
    });
  }

  loadPlanilla(): void {
    this.api.getPlanilla(this.partidoId).subscribe((rows) => {
      if (!this.partido) return;
      const loc: Line[] = [];
      const vis: Line[] = [];
      for (const r of rows) {
        const line: Line = {
          jugadorId: r.jugadorId,
          titular: r.titular,
          nombre: r.jugador
            ? `${r.jugador.apellido}, ${r.jugador.nombre}`
            : undefined,
          dni: r.jugador?.dni,
          numeroCamiseta: r.numeroCamiseta ?? null,
        };
        if (r.equipoId === this.partido.equipoLocalId) loc.push(line);
        else vis.push(line);
      }
      this.local = loc;
      this.visit = vis;
    });
  }

  loadEventosCambios(): void {
    this.api.listEventos(this.partidoId).subscribe((e) => (this.eventos = e));
    this.api.listCambios(this.partidoId).subscribe((c) => (this.cambios = c));
  }

  /** Misma regla que el API: inscripción solapa el día civil (APP_TIMEZONE) **actual**. */
  private inscripcionVigenteAhora(ins: Inscripcion): boolean {
    const tz = environment.appTimeZone ?? 'America/Argentina/Buenos_Aires';
    return inscripcionSolapaDiaCivil(ins, new Date(), tz);
  }

  candidatosLocal(): Inscripcion[] {
    const ids = new Set(this.local.map((l) => l.jugadorId));
    return this.inscriptosLocal.filter(
      (i) => !ids.has(i.jugadorId) && this.inscripcionVigenteAhora(i),
    );
  }

  candidatosVis(): Inscripcion[] {
    const ids = new Set(this.visit.map((l) => l.jugadorId));
    return this.inscriptosVis.filter(
      (i) => !ids.has(i.jugadorId) && this.inscripcionVigenteAhora(i),
    );
  }

  nombreInscripcion(i: Inscripcion): string {
    const j = i.jugador;
    return j ? `${j.apellido}, ${j.nombre}` : `#${i.jugadorId}`;
  }

  jugadorNombre(j?: Jugador | null): string {
    if (!j) return '';
    return `${j.apellido}, ${j.nombre}`;
  }

  /** Etiqueta de equipo (mismo criterio que el selector de cambios: Local/Visitante + club). */
  equipoLabelPorJugadorId(jugadorId: number): string {
    if (!this.partido) return '';
    const locClub = this.partido.equipoLocal?.club?.nombre;
    const visClub = this.partido.equipoVisitante?.club?.nombre;
    if (this.local.some((l) => l.jugadorId === jugadorId)) {
      return locClub != null && locClub !== '' ? `Local — ${locClub}` : 'Local';
    }
    if (this.visit.some((l) => l.jugadorId === jugadorId)) {
      return visClub != null && visClub !== '' ? `Visitante — ${visClub}` : 'Visitante';
    }
    return '';
  }

  labelTipoEvento(t: TipoEvento): string {
    switch (t) {
      case 'GOL':
        return 'Gol';
      case 'GOL_EN_CONTRA':
        return 'Gol en contra';
      case 'AMARILLA':
        return 'Amarilla';
      case 'ROJA':
        return 'Roja';
      default:
        return t;
    }
  }

  opcionesEventoJugador(): { id: number; label: string }[] {
    const out: { id: number; label: string }[] = [];
    const locClub = this.partido?.equipoLocal?.club?.nombre ?? 'Local';
    const visClub = this.partido?.equipoVisitante?.club?.nombre ?? 'Visitante';
    for (const l of this.local) {
      out.push({
        id: l.jugadorId,
        label: `${locClub} — ${l.nombre ?? '#' + l.jugadorId}`,
      });
    }
    for (const l of this.visit) {
      out.push({
        id: l.jugadorId,
        label: `${visClub} — ${l.nombre ?? '#' + l.jugadorId}`,
      });
    }
    return out;
  }

  lineasCambio(equipo: 'local' | 'vis'): Line[] {
    return equipo === 'local' ? this.local : this.visit;
  }

  /** Misma validación que «Ver pase» en LBF: instante actual (sin fecha del partido). */
  previewAddInscripto(side: 'local' | 'vis', jugadorId: number | null): void {
    if (!this.partido || !jugadorId) return;
    const eqId =
      side === 'local' ? this.partido.equipoLocalId : this.partido.equipoVisitanteId;
    this.inscripcionesApi
      .preview(eqId, jugadorId)
      .subscribe({
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

  agregarDesdeInscripcion(side: 'local' | 'vis', jugadorId: number | null, titular: boolean): void {
    if (!this.partido || !jugadorId) return;
    const eqId =
      side === 'local' ? this.partido.equipoLocalId : this.partido.equipoVisitanteId;
    this.inscripcionesApi
      .preview(eqId, jugadorId)
      .subscribe({
        next: (p) => {
          if (!p.puede) {
            void Swal.fire({ icon: 'error', text: p.motivo ?? 'No puede jugar' });
            return;
          }
          const ins =
            side === 'local'
              ? this.inscriptosLocal.find((i) => i.jugadorId === jugadorId)
              : this.inscriptosVis.find((i) => i.jugadorId === jugadorId);
          const j = ins?.jugador;
          const numCam =
            side === 'local' ? this.addLocalNumeroCamiseta : this.addVisNumeroCamiseta;
          const line: Line = {
            jugadorId,
            titular,
            nombre: j ? `${j.apellido}, ${j.nombre}` : undefined,
            dni: j?.dni,
            numeroCamiseta: numCam ?? null,
          };
          if (side === 'local') {
            this.local = [...this.local, line];
            this.addLocalJugadorId = null;
            this.addLocalNumeroCamiseta = null;
          } else {
            this.visit = [...this.visit, line];
            this.addVisJugadorId = null;
            this.addVisNumeroCamiseta = null;
          }
          this.persistPlanilla();
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  removeLine(side: 'local' | 'vis', idx: number): void {
    if (side === 'local') this.local = this.local.filter((_, i) => i !== idx);
    else this.visit = this.visit.filter((_, i) => i !== idx);
    this.persistPlanilla();
  }

  toggleTitular(side: 'local' | 'vis', idx: number): void {
    const arr = side === 'local' ? this.local : this.visit;
    const copy = [...arr];
    copy[idx] = { ...copy[idx], titular: !copy[idx].titular };
    if (side === 'local') this.local = copy;
    else this.visit = copy;
    this.persistPlanilla();
  }

  /** Texto centrado en el stepper de camiseta (fila o alta). */
  labelCamisetaValor(n: number | null | undefined): string {
    if (n == null) return '—';
    return String(n);
  }

  labelCamiseta(l: Line): string {
    return this.labelCamisetaValor(l.numeroCamiseta);
  }

  /** Stepper Nº en el bloque «Agregar desde inscriptos». */
  ajustarCamisetaAlta(side: 'local' | 'vis', delta: number): void {
    const prev = side === 'local' ? this.addLocalNumeroCamiseta : this.addVisNumeroCamiseta;
    const cur = prev ?? 0;
    const next = Math.max(0, Math.min(99, cur + delta));
    if (prev === null && next === 0) return;
    if (side === 'local') this.addLocalNumeroCamiseta = next;
    else this.addVisNumeroCamiseta = next;
  }

  puedeDecrementarCamisetaAlta(side: 'local' | 'vis'): boolean {
    const n = side === 'local' ? this.addLocalNumeroCamiseta : this.addVisNumeroCamiseta;
    return (n ?? 0) > 0;
  }

  puedeIncrementarCamisetaAlta(side: 'local' | 'vis'): boolean {
    const n = side === 'local' ? this.addLocalNumeroCamiseta : this.addVisNumeroCamiseta;
    return (n ?? 0) < 99;
  }

  /** Incrementa/decrementa Nº (0–99) y persiste al instante. */
  ajustarCamiseta(side: 'local' | 'vis', idx: number, delta: number): void {
    const arr = side === 'local' ? this.local : this.visit;
    const line = arr[idx];
    if (!line) return;
    const cur = line.numeroCamiseta ?? 0;
    const next = Math.max(0, Math.min(99, cur + delta));
    const copy = [...arr];
    copy[idx] = { ...line, numeroCamiseta: next };
    if (side === 'local') this.local = copy;
    else this.visit = copy;
    this.persistPlanilla();
  }

  puedeDecrementarCamiseta(l: Line): boolean {
    return (l.numeroCamiseta ?? 0) > 0;
  }

  puedeIncrementarCamiseta(l: Line): boolean {
    return (l.numeroCamiseta ?? 0) < 99;
  }

  guardarPlanilla(): void {
    if (!this.partido) return;
    this.persistPlanilla({ showSuccessToast: true });
  }

  private buildPlanillaBody() {
    return {
      local: this.local.map((l) => ({
        jugadorId: l.jugadorId,
        titular: l.titular,
        numeroCamiseta: l.numeroCamiseta ?? null,
      })),
      visitante: this.visit.map((l) => ({
        jugadorId: l.jugadorId,
        titular: l.titular,
        numeroCamiseta: l.numeroCamiseta ?? null,
      })),
      capitanLocalJugadorId: this.capitanLocalJugadorId,
      capitanVisitanteJugadorId: this.capitanVisitanteJugadorId,
      arbitroPrincipal: this.arbitroPrincipal.trim() || null,
      juezLinea1: this.juezLinea1.trim() || null,
      juezLinea2: this.juezLinea2.trim() || null,
      observaciones: this.observaciones.trim() || null,
    };
  }

  /** Si se quitó el jugador designado capitán, limpiar el selector. */
  private sanitizeCapitanesSiJugadorNoEnPlanilla(): void {
    const localIds = new Set(this.local.map((l) => l.jugadorId));
    const visIds = new Set(this.visit.map((l) => l.jugadorId));
    if (this.capitanLocalJugadorId != null && !localIds.has(this.capitanLocalJugadorId)) {
      this.capitanLocalJugadorId = null;
    }
    if (
      this.capitanVisitanteJugadorId != null &&
      !visIds.has(this.capitanVisitanteJugadorId)
    ) {
      this.capitanVisitanteJugadorId = null;
    }
  }

  /**
   * PUT planilla + acta. Usado al agregar/quitar, cambiar titular/suplente (sin toast) y al guardar completo.
   */
  private persistPlanilla(opts?: { showSuccessToast?: boolean }): void {
    if (!this.partido) return;
    this.sanitizeCapitanesSiJugadorNoEnPlanilla();
    this.saving = true;
    this.api
      .putPlanilla(this.partidoId, this.buildPlanillaBody())
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          if (opts?.showSuccessToast) {
            void Swal.fire({
              icon: 'success',
              title: 'Planilla guardada',
              timer: 1200,
              showConfirmButton: false,
            });
          }
          this.api.get(this.partidoId).subscribe((p) => {
            this.partido = p;
            this.syncActaFromPartido(p);
          });
          this.loadPlanilla();
        },
        error: (e) => {
          apiErrorAlert(e);
          this.api.get(this.partidoId).subscribe((p) => {
            this.partido = p;
            this.syncActaFromPartido(p);
          });
          this.loadPlanilla();
        },
      });
  }

  private async pedirConfiguracionSuspensionRoja(): Promise<SuspensionRojaPayload | null> {
    const result = await Swal.fire<SuspensionRojaPayload>({
      title: 'Configurar suspensión por roja',
      html:
        '<div class="text-left space-y-3">' +
        '<p class="text-sm text-gray-600">Elegí cómo se cumple la suspensión automática por tarjeta roja.</p>' +
        '<div>' +
        '<label for="susp-modo" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Tipo de suspensión</label>' +
        '<select id="susp-modo" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">' +
        '<option value="partidos">Por partidos</option>' +
        '<option value="fecha">Hasta fecha</option>' +
        '</select>' +
        '</div>' +
        '<div>' +
        '<label for="susp-partidos" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Partidos restantes</label>' +
        '<input id="susp-partidos" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" type="number" min="1" value="1">' +
        '</div>' +
        '<div>' +
        '<label for="susp-fecha" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Fecha hasta</label>' +
        '<input id="susp-fecha" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" type="date">' +
        '</div>' +
        '</div>',
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      width: 560,
      customClass: {
        popup: 'rounded-xl',
        title: 'text-lg font-semibold text-gray-900',
        confirmButton:
          'inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800',
        cancelButton:
          'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50',
      },
      buttonsStyling: false,
      didOpen: () => {
        const modoEl = document.getElementById('susp-modo') as HTMLSelectElement | null;
        const partidosEl = document.getElementById('susp-partidos') as HTMLInputElement | null;
        const fechaEl = document.getElementById('susp-fecha') as HTMLInputElement | null;
        const updateVisibility = () => {
          const byPartidos = modoEl?.value === 'partidos';
          if (partidosEl) partidosEl.disabled = !byPartidos;
          if (fechaEl) fechaEl.disabled = byPartidos;
        };
        modoEl?.addEventListener('change', updateVisibility);
        updateVisibility();
      },
      preConfirm: () => {
        const mode = (document.getElementById('susp-modo') as HTMLSelectElement | null)?.value;
        const partidosRaw = (document.getElementById('susp-partidos') as HTMLInputElement | null)
          ?.value;
        const fechaRaw = (document.getElementById('susp-fecha') as HTMLInputElement | null)?.value;
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
    if (!result.isConfirmed) {
      return null;
    }
    return result.value ?? null;
  }

  async registrarEvento(): Promise<void> {
    if (!this.partido || this.partido.estado !== 'EN_JUEGO') {
      void Swal.fire({
        icon: 'warning',
        title: 'No se puede registrar',
        text: 'El partido debe estar en juego para registrar goles y tarjetas.',
      });
      return;
    }
    if (this.evForm.invalid) {
      this.evForm.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Elegí un jugador de la planilla, el tipo de evento y el minuto.',
      });
      return;
    }
    const v = this.evForm.getRawValue();
    const notas = v.notas.trim() || null;
    let suspensionRoja: SuspensionRojaPayload | undefined;
    if (v.tipo === 'ROJA') {
      const cfg = await this.pedirConfiguracionSuspensionRoja();
      if (!cfg) {
        return;
      }
      suspensionRoja = cfg;
    }
    this.api
      .addEvento(this.partidoId, {
        jugadorId: v.jugadorId,
        tipo: v.tipo,
        minuto: v.minuto,
        notas,
        suspensionRoja,
      })
      .subscribe({
        next: () => {
          void Swal.fire({
            icon: 'success',
            title: 'Evento',
            timer: 1000,
            showConfirmButton: false,
          });
          this.loadEventosCambios();
          this.evForm.reset({
            jugadorId: 0,
            tipo: 'GOL',
            minuto: 0,
            notas: '',
          });
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  registrarCambio(): void {
    if (!this.partido || this.partido.estado !== 'EN_JUEGO') {
      void Swal.fire({
        icon: 'warning',
        title: 'No se puede registrar',
        text: 'El partido debe estar en juego para registrar cambios.',
      });
      return;
    }
    if (this.cambioForm.invalid) {
      this.cambioForm.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Elegí el equipo, el jugador que sale, el que entra y el minuto.',
      });
      return;
    }
    const v = this.cambioForm.getRawValue();
    if (v.saleId === v.entraId) {
      void Swal.fire({
        icon: 'warning',
        title: 'No se puede registrar',
        text: 'El jugador que sale y el que entra deben ser distintos.',
      });
      return;
    }
    this.api
      .addCambio(this.partidoId, {
        jugadorSaleId: v.saleId,
        jugadorEntraId: v.entraId,
        minuto: v.minuto,
      })
      .subscribe({
        next: () => {
          void Swal.fire({
            icon: 'success',
            title: 'Cambio',
            timer: 1000,
            showConfirmButton: false,
          });
          this.loadEventosCambios();
          this.cambioForm.patchValue({
            saleId: 0,
            entraId: 0,
            minuto: 0,
          });
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  eliminarEvento(e: EventoPartido): void {
    if (!this.partido || this.partido.estado !== 'EN_JUEGO') {
      void Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'Solo se pueden eliminar eventos con el partido en juego.',
      });
      return;
    }
    const desc = `${this.labelTipoEvento(e.tipo)} — ${this.jugadorNombre(e.jugador) || 'Jug. ' + e.jugadorId}`;
    void Swal.fire({
      title: '¿Eliminar este evento?',
      text: desc,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.deleteEvento(this.partidoId, e.id).subscribe({
        next: () => {
          void Swal.fire({
            icon: 'success',
            title: 'Evento eliminado',
            timer: 1000,
            showConfirmButton: false,
          });
          this.loadEventosCambios();
          this.api.get(this.partidoId).subscribe({
            next: (p) => {
              this.partido = p;
              this.syncActaFromPartido(p);
            },
          });
        },
        error: (err) => apiErrorAlert(err),
      });
    });
  }

  eliminarCambio(c: CambioPartido): void {
    if (!this.partido || this.partido.estado !== 'EN_JUEGO') {
      void Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'Solo se pueden eliminar cambios con el partido en juego.',
      });
      return;
    }
    void Swal.fire({
      title: '¿Eliminar esta sustitución?',
      text: `${c.minuto}' — ${this.jugadorNombre(c.jugadorSale) || c.jugadorSaleId} → ${this.jugadorNombre(c.jugadorEntra) || c.jugadorEntraId}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.deleteCambio(this.partidoId, c.id).subscribe({
        next: () => {
          void Swal.fire({
            icon: 'success',
            title: 'Cambio eliminado',
            timer: 1000,
            showConfirmButton: false,
          });
          this.loadEventosCambios();
        },
        error: (err) => apiErrorAlert(err),
      });
    });
  }

  labelEstado(e: EstadoPartido): string {
    return e === 'PENDIENTE' ? 'Pendiente' : e === 'EN_JUEGO' ? 'En juego' : 'Finalizado';
  }

  onEstadoChange(nuevo: EstadoPartido): void {
    if (!this.partido || nuevo === this.partido.estado) return;
    this.estadoSaving = true;
    this.api
      .updateEstado(this.partidoId, { estado: nuevo })
      .pipe(finalize(() => (this.estadoSaving = false)))
      .subscribe({
        next: (p) => {
          this.partido = p;
          this.syncActaFromPartido(p);
          this.loadEventosCambios();
          Swal.fire({ icon: 'success', toast: true, position: 'top', title: 'Estado del partido cambiado correctamente', timer: 1200, showConfirmButton: false });
          this.reload();
        },
        error: (e) => {
          void apiErrorAlert(e);
          this.reload();
        },
      });
  }
}
