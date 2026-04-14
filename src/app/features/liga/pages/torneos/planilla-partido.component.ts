import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type {
  CambioPartido,
  EstadoPartido,
  EventoPartido,
  Partido,
  TipoEvento,
} from '../../models/api.types';
import { PartidosApiService } from '../../services/partidos-api.service';

type Line = { jugadorId: number; titular: boolean; nombre?: string };

@Component({
  selector: 'app-planilla-partido',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './planilla-partido.component.html',
})
export class PlanillaPartidoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PartidosApiService);
  private readonly fb = inject(FormBuilder);

  torneoId!: number;
  partidoId!: number;
  partido: Partido | null = null;
  local: Line[] = [];
  visit: Line[] = [];
  eventos: EventoPartido[] = [];
  cambios: CambioPartido[] = [];
  loading = true;
  saving = false;
  estadoSaving = false;
  readonly estadosPartido: EstadoPartido[] = ['PENDIENTE', 'EN_JUEGO', 'FINALIZADO'];

  /** Campos no persistidos en API (Prisma); uso operativo / futura migración. */
  capitanLocal = '';
  capitanVis = '';
  arbitro = '';
  jueces = '';
  observaciones = '';

  addJugadorId = 0;
  addEquipo: 'local' | 'vis' = 'local';
  addTitular = true;
  previewMsg = '';

  evForm = this.fb.nonNullable.group({
    jugadorId: [0, Validators.min(1)],
    tipo: ['GOL' as TipoEvento, Validators.required],
    minuto: [0, [Validators.required, Validators.min(0)]],
  });

  cambioForm = this.fb.nonNullable.group({
    saleId: [0, Validators.min(1)],
    entraId: [0, Validators.min(1)],
    minuto: [0, Validators.required],
  });

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.partidoId = Number(this.route.snapshot.paramMap.get('partidoId'));
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.api
      .get(this.partidoId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (p) => {
          this.partido = p;
          this.loadPlanilla();
          this.loadEventosCambios();
        },
        error: () => (this.partido = null),
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
        };
        if (r.equipoId === this.partido!.equipoLocalId) loc.push(line);
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

  previewAdd(): void {
    if (!this.partido || !this.addJugadorId) return;
    const eqId =
      this.addEquipo === 'local'
        ? this.partido.equipoLocalId
        : this.partido.equipoVisitanteId;
    this.api
      .previewJugador(this.partidoId, this.addJugadorId, eqId)
      .subscribe((p) => {
        this.previewMsg = p.puede
          ? `OK${p.esForaneo ? ' (foráneo)' : ''}`
          : (p.motivo ?? 'No puede');
        if (!p.puede) {
          void Swal.fire('No puede jugar', p.motivo ?? '', 'error');
        }
      });
  }

  addLine(): void {
    if (!this.partido || !this.addJugadorId) return;
    const eqId =
      this.addEquipo === 'local'
        ? this.partido.equipoLocalId
        : this.partido.equipoVisitanteId;
    this.api
      .previewJugador(this.partidoId, this.addJugadorId, eqId)
      .subscribe((p) => {
        if (!p.puede) {
          void Swal.fire('Validación', p.motivo ?? '', 'error');
          return;
        }
        const line: Line = {
          jugadorId: this.addJugadorId,
          titular: this.addTitular,
        };
        if (this.addEquipo === 'local') this.local = [...this.local, line];
        else this.visit = [...this.visit, line];
        this.addJugadorId = 0;
        this.previewMsg = '';
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

  guardarPlanilla(): void {
    if (!this.partido) return;
    this.saving = true;
    this.api
      .putPlanilla(this.partidoId, {
        local: this.local.map((l) => ({
          jugadorId: l.jugadorId,
          titular: l.titular,
        })),
        visitante: this.visit.map((l) => ({
          jugadorId: l.jugadorId,
          titular: l.titular,
        })),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Planilla guardada', timer: 1200, showConfirmButton: false });
          this.loadPlanilla();
        },
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
  }

  registrarEvento(): void {
    if (this.evForm.invalid) return;
    const v = this.evForm.getRawValue();
    this.api
      .addEvento(this.partidoId, {
        jugadorId: v.jugadorId,
        tipo: v.tipo,
        minuto: v.minuto,
      })
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Evento', timer: 1000, showConfirmButton: false });
          this.loadEventosCambios();
        },
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
  }

  registrarCambio(): void {
    if (this.cambioForm.invalid) return;
    const v = this.cambioForm.getRawValue();
    this.api
      .addCambio(this.partidoId, {
        jugadorSaleId: v.saleId,
        jugadorEntraId: v.entraId,
        minuto: v.minuto,
      })
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Cambio', timer: 1000, showConfirmButton: false });
          this.loadEventosCambios();
        },
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
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
          this.loadEventosCambios();
        },
        error: (e) => {
          void Swal.fire('Error', String(e?.error?.message ?? e), 'error');
          this.reload();
        },
      });
  }
}
