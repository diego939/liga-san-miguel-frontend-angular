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
import { apiErrorAlert } from '../../utils/api-error';

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
  saving = false;
  modal = false;
  form = this.fb.nonNullable.group({ clubId: [0, Validators.min(1)] });

  ngOnInit(): void {
    this.torneoId = Number(this.route.parent!.snapshot.paramMap.get('torneoId'));
    this.clubesApi.listAllForSelect().subscribe({
      next: (r) => (this.clubs = r.items),
      error: (e) => apiErrorAlert(e),
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.equiposApi
      .listByTorneo(this.torneoId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => (this.items = rows),
        error: (e) => apiErrorAlert(e),
      });
  }

  openModal(): void {
    this.saving = false;
    this.form.reset({ clubId: 0 });
    this.modal = true;
  }

  closeModal(): void {
    this.modal = false;
    this.saving = false;
  }

  asociar(): void {
    const clubId = this.form.getRawValue().clubId;
    if (clubId < 1) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Seleccioná un club.',
      });
      return;
    }
    this.saving = true;
    this.equiposApi
      .asociar(this.torneoId, { clubId })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Club agregado', timer: 1200, showConfirmButton: false });
          this.modal = false;
          this.load();
        },
        error: (e) => apiErrorAlert(e),
      });
  }

  quitar(e: EquipoTorneo): void {
    void Swal.fire({ title: '¿Quitar club del torneo?', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.equiposApi.remove(e.id).subscribe({
        next: () => this.load(),
        error: (err) => apiErrorAlert(err),
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
