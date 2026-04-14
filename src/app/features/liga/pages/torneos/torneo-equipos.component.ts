import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Club, EquipoTorneo } from '../../models/api.types';
import { ClubesApiService } from '../../services/clubes-api.service';
import { EquiposApiService } from '../../services/equipos-api.service';
import { ligaModal } from '../../shared/liga-ui';

@Component({
  selector: 'app-torneo-equipos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './torneo-equipos.component.html',
})
export class TorneoEquiposComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly equiposApi = inject(EquiposApiService);
  private readonly clubesApi = inject(ClubesApiService);
  private readonly fb = inject(FormBuilder);

  torneoId!: number;
  items: EquipoTorneo[] = [];
  clubs: Club[] = [];
  loading = false;
  modal = false;
  form = this.fb.nonNullable.group({ clubId: [0, Validators.min(1)] });

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.clubesApi.listAllForSelect().subscribe((r) => (this.clubs = r.items));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.equiposApi
      .listByTorneo(this.torneoId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => (this.items = rows),
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
  }

  openModal(): void {
    this.form.reset({ clubId: 0 });
    this.modal = true;
  }

  asociar(): void {
    const clubId = this.form.getRawValue().clubId;
    if (clubId < 1) return;
    this.equiposApi.asociar(this.torneoId, { clubId }).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Club agregado', timer: 1200, showConfirmButton: false });
        this.modal = false;
        this.load();
      },
      error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
    });
  }

  quitar(e: EquipoTorneo): void {
    void Swal.fire({ title: '¿Quitar club del torneo?', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.equiposApi.remove(e.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Error', String(err?.error?.message ?? err), 'error'),
      });
    });
  }

  inscripciones(e: EquipoTorneo): void {
    void this.router.navigate([
      '/pages/torneos',
      this.torneoId,
      'equipos',
      e.id,
      'inscripciones',
    ]);
  }
}
