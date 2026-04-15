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
import { InscripcionesApiService } from '../../services/inscripciones-api.service';
import { PartidosApiService } from '../../services/partidos-api.service';

type Line = {
  jugadorId: number;
  titular: boolean;
  nombre?: string;
  numeroCamiseta?: number | null;
};

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
  addLocalTitular = true;
  addVisTitular = true;
  previewMsgLocal = '';
  previewMsgVis = '';

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

  constructor() {
    this.cambioForm
      .get('equipo')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.cambioForm.patchValue({ saleId: 0, entraId: 0 }, { emitEvent: false });
      });
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
        error: () => (this.partido = null),
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
      error: () => {
        this.inscriptosLocal = [];
        this.inscriptosVis = [];
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

  /** Alineado con el backend: vigencia que solapa el día UTC de la fecha del partido. */
  private inscripcionVigenteEnFechaPartido(ins: Inscripcion): boolean {
    if (!this.partido?.fecha) return false;
    const ref = new Date(this.partido.fecha);
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();
    const d = ref.getUTCDate();
    const inicio = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const fin = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
    const fi = new Date(ins.fechaInicio);
    if (fi > fin) return false;
    const ff = ins.fechaFin ? new Date(ins.fechaFin) : null;
    if (ff !== null && ff <= inicio) return false;
    return true;
  }

  candidatosLocal(): Inscripcion[] {
    const ids = new Set(this.local.map((l) => l.jugadorId));
    return this.inscriptosLocal.filter(
      (i) => !ids.has(i.jugadorId) && this.inscripcionVigenteEnFechaPartido(i),
    );
  }

  candidatosVis(): Inscripcion[] {
    const ids = new Set(this.visit.map((l) => l.jugadorId));
    return this.inscriptosVis.filter(
      (i) => !ids.has(i.jugadorId) && this.inscripcionVigenteEnFechaPartido(i),
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

  previewAddInscripto(side: 'local' | 'vis', jugadorId: number | null): void {
    if (!this.partido || !jugadorId) return;
    const eqId =
      side === 'local' ? this.partido.equipoLocalId : this.partido.equipoVisitanteId;
    this.api.previewJugador(this.partidoId, jugadorId, eqId).subscribe((p) => {
      const msg = p.puede
        ? `OK${p.esForaneo ? ' (foráneo)' : ''}`
        : (p.motivo ?? 'No puede');
      if (side === 'local') this.previewMsgLocal = msg;
      else this.previewMsgVis = msg;
      if (!p.puede) {
        void Swal.fire('No puede jugar', p.motivo ?? '', 'error');
      }
    });
  }

  agregarDesdeInscripcion(side: 'local' | 'vis', jugadorId: number | null, titular: boolean): void {
    if (!this.partido || !jugadorId) return;
    const eqId =
      side === 'local' ? this.partido.equipoLocalId : this.partido.equipoVisitanteId;
    this.api.previewJugador(this.partidoId, jugadorId, eqId).subscribe((p) => {
      if (!p.puede) {
        void Swal.fire('Validación', p.motivo ?? '', 'error');
        return;
      }
      const ins =
        side === 'local'
          ? this.inscriptosLocal.find((i) => i.jugadorId === jugadorId)
          : this.inscriptosVis.find((i) => i.jugadorId === jugadorId);
      const j = ins?.jugador;
      const line: Line = {
        jugadorId,
        titular,
        nombre: j ? `${j.apellido}, ${j.nombre}` : undefined,
        numeroCamiseta: null,
      };
      if (side === 'local') {
        this.local = [...this.local, line];
        this.addLocalJugadorId = null;
        this.previewMsgLocal = '';
      } else {
        this.visit = [...this.visit, line];
        this.addVisJugadorId = null;
        this.previewMsgVis = '';
      }
    });
  }

  removeLine(side: 'local' | 'vis', idx: number): void {
    if (side === 'local') this.local = this.local.filter((_, i) => i !== idx);
    else this.visit = this.visit.filter((_, i) => i !== idx);
  }

  toggleTitular(side: 'local' | 'vis', idx: number): void {
    const arr = side === 'local' ? this.local : this.visit;
    const copy = [...arr];
    copy[idx] = { ...copy[idx], titular: !copy[idx].titular };
    if (side === 'local') this.local = copy;
    else this.visit = copy;
  }

  patchCamiseta(side: 'local' | 'vis', idx: number, raw: string): void {
    const n = raw === '' ? null : Number(raw);
    const val = raw === '' || Number.isNaN(n) ? null : n;
    const arr = side === 'local' ? [...this.local] : [...this.visit];
    arr[idx] = { ...arr[idx], numeroCamiseta: val };
    if (side === 'local') this.local = arr;
    else this.visit = arr;
  }

  guardarPlanilla(): void {
    if (!this.partido) return;
    this.saving = true;
    this.api
      .putPlanilla(this.partidoId, {
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
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          void Swal.fire({
            icon: 'success',
            title: 'Planilla guardada',
            timer: 1200,
            showConfirmButton: false,
          });
          this.api.get(this.partidoId).subscribe((p) => {
            this.partido = p;
            this.syncActaFromPartido(p);
          });
          this.loadPlanilla();
        },
        error: (e) => void Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
  }

  registrarEvento(): void {
    if (this.evForm.invalid) return;
    const v = this.evForm.getRawValue();
    const notas = v.notas.trim() || null;
    this.api
      .addEvento(this.partidoId, {
        jugadorId: v.jugadorId,
        tipo: v.tipo,
        minuto: v.minuto,
        notas,
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
          this.evForm.patchValue({ notas: '' });
        },
        error: (e) => void Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
  }

  registrarCambio(): void {
    if (this.cambioForm.invalid) return;
    const v = this.cambioForm.getRawValue();
    if (v.saleId === v.entraId) {
      void Swal.fire('Cambio', 'El jugador que sale y el que entra deben ser distintos', 'info');
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
        },
        error: (e) => void Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
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
        },
        error: (e) => {
          void Swal.fire('Error', String(e?.error?.message ?? e), 'error');
          this.reload();
        },
      });
  }
}
