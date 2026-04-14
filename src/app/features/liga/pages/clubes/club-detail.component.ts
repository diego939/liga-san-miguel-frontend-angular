import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Club, ClubPersonal } from '../../models/api.types';
import { ClubesApiService } from '../../services/clubes-api.service';
import { ligaModal } from '../../shared/liga-ui';

@Component({
  selector: 'app-club-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './club-detail.component.html',
})
export class ClubDetailComponent implements OnInit {
  readonly lm = ligaModal;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClubesApiService);
  private readonly fb = inject(FormBuilder);

  id!: number;
  club: Club | null = null;
  personal: ClubPersonal[] = [];
  loading = true;
  modalPer = false;
  /** Si está definido, el modal guarda con PATCH (editar). */
  editingPer: ClubPersonal | null = null;
  perForm = this.fb.nonNullable.group({
    tipo: ['', Validators.required],
    nombre: ['', Validators.required],
    dni: [''],
    telefono: [''],
  });

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .get(this.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (c) => (this.club = c),
        error: () => (this.club = null),
      });
    this.api.listPersonal(this.id).subscribe((p) => (this.personal = p));
  }

  openAddPer(): void {
    this.editingPer = null;
    this.perForm.reset({ tipo: '', nombre: '', dni: '', telefono: '' });
    this.modalPer = true;
  }

  openEditPer(p: ClubPersonal): void {
    this.editingPer = p;
    this.perForm.patchValue({
      tipo: p.tipo,
      nombre: p.nombre,
      dni: p.dni ?? '',
      telefono: p.telefono ?? '',
    });
    this.modalPer = true;
  }

  closePerModal(): void {
    this.modalPer = false;
    this.editingPer = null;
  }

  savePer(): void {
    if (this.perForm.invalid) return;
    const v = this.perForm.getRawValue();
    const dni = v.dni?.trim() ? v.dni.trim() : null;
    const telefono = v.telefono?.trim() ? v.telefono.trim() : null;
    const req = this.editingPer
      ? this.api.updatePersonal(this.id, this.editingPer.id, {
          tipo: v.tipo,
          nombre: v.nombre,
          dni,
          telefono,
        })
      : this.api.addPersonal(this.id, {
          tipo: v.tipo,
          nombre: v.nombre,
          ...(dni ? { dni } : {}),
          ...(telefono ? { telefono } : {}),
        });
    req.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.editingPer ? 'Actualizado' : 'Agregado',
          timer: 1000,
          showConfirmButton: false,
        });
        this.closePerModal();
        this.load();
      },
      error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
    });
  }

  deletePer(p: ClubPersonal): void {
    void Swal.fire({ title: '¿Eliminar?', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.deletePersonal(this.id, p.id).subscribe({
        next: () => this.load(),
        error: (e) => Swal.fire('Error', String(e?.error?.message ?? e), 'error'),
      });
    });
  }
}
