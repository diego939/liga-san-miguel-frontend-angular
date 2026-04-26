import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import type { Club, ClubPersonal } from '../../models/api.types';
import { ClubesApiService } from '../../services/clubes-api.service';
import { ligaModal } from '../../shared/liga-ui';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';
@Component({
  selector: 'app-club-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, IfNotOperadorDirective],
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
  savingPer = false;
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
        next: (c) => {
          this.club = c;
          this.api.listPersonal(this.id).subscribe({
            next: (p) => (this.personal = p),
            error: (e) => {
              this.personal = [];
              this.apiErrorAlert(e);
            },
          });
        },
        error: (e) => {
          this.club = null;
          this.personal = [];
          this.apiErrorAlert(e);
        },
      });
  }

  openAddPer(): void {
    this.editingPer = null;
    this.savingPer = false;
    this.perForm.reset({ tipo: '', nombre: '', dni: '', telefono: '' });
    this.modalPer = true;
  }

  openEditPer(p: ClubPersonal): void {
    this.editingPer = p;
    this.savingPer = false;
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
    this.savingPer = false;
  }

  savePer(): void {
    if (this.perForm.invalid) {
      this.perForm.markAllAsTouched();
      return;
    }
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
    this.savingPer = true;
    req.pipe(finalize(() => (this.savingPer = false))).subscribe({
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
      error: (e) => this.apiErrorAlert(e),
    });
  }

  deletePer(p: ClubPersonal): void {
    void Swal.fire({ title: '¿Eliminar?', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.deletePersonal(this.id, p.id).subscribe({
        next: () => this.load(),
        error: (e) => this.apiErrorAlert(e),
      });
    });
  }

  isPerInvalid(controlName: keyof typeof this.perForm.controls): boolean {
    const c = this.perForm.controls[controlName];
    return c.invalid && (c.touched || c.dirty);
  }

  private apiErrorMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
    }
    const body = err.error;
    if (typeof body === 'string') {
      return body;
    }
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      if ('message' in o && o['message'] != null) {
        const m = o['message'];
        if (Array.isArray(m)) {
          return m.map(String).filter(Boolean).join('\n');
        }
        if (typeof m === 'string') {
          return m;
        }
      }
      try {
        return JSON.stringify(body);
      } catch {
        return String(body);
      }
    }
    if (body == null || body === '') {
      return '';
    }
    return String(body);
  }

  private apiErrorAlert(err: unknown): void {
    void Swal.fire({
      icon: 'error',
      text: this.apiErrorMessage(err),
    });
  }
}
