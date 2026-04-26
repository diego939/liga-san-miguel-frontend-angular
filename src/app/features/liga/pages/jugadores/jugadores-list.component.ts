import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Datepicker as FlowbiteDatepicker } from 'flowbite-datepicker';
import { ClubesApiService } from '../../services/clubes-api.service';
import { JugadoresApiService } from '../../services/jugadores-api.service';
import type { Club, Jugador } from '../../models/api.types';
import { LigaPaginationComponent } from '../../shared/liga-pagination.component';
import { LigaSortIndicatorComponent } from '../../shared/liga-sort-indicator.component';
import { applySortClick } from '../../utils/column-sort.util';
import { formatDateOnly } from '../../utils/date-format';
import { ligaModal } from '../../shared/liga-ui';
import { IfNotOperadorDirective } from '../../../../core/directives/if-not-operador.directive';

@Component({
  selector: 'app-jugadores-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    LigaPaginationComponent,
    LigaSortIndicatorComponent,
    IfNotOperadorDirective,
  ],
  templateUrl: './jugadores-list.component.html',
  styleUrl: './jugadores-list.component.css',
})
export class JugadoresListComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly api = inject(JugadoresApiService);
  private readonly clubesApi = inject(ClubesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly lm = ligaModal;

  clubs: Club[] = [];
  items: Jugador[] = [];
  total = 0;
  page = 1;
  readonly limit = 10;
  /** Carga de la grilla. */
  loading = false;
  /** Envío del modal crear/editar. */
  saving = false;

  filterDni = '';
  filterQ = '';

  sortBy = 'apellido';
  sortOrder: 'asc' | 'desc' = 'asc';

  modalOpen = false;
  editing: Jugador | null = null;
  @ViewChild('fechaNacimientoInput') private fechaNacimientoInput?: ElementRef<HTMLInputElement>;
  private fechaNacimientoDatepicker: any = null;

  form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^\d+$/)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    telefono: [''],
    fechaNacimiento: ['', Validators.required],
    nacionalidad: [''],
    /** Solo alta: pase inicial con origen null. */
    clubDestinoInicialId: [0],
  });

  ngOnInit(): void {
    this.clubesApi.listAllForSelect().subscribe({
      next: (r) => (this.clubs = r.items),
      error: (e) => this.apiErrorAlert(e),
    });
    this.load();
  }

  ngAfterViewChecked(): void {
    if (!this.modalOpen) return;
    this.initFechaNacimientoDatepicker();
  }

  ngOnDestroy(): void {
    this.destroyFechaNacimientoDatepicker();
  }

  load(): void {
    this.loading = true;
    this.api
      .list({
        page: this.page,
        limit: this.limit,
        dni: this.filterDni || undefined,
        q: this.filterQ || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  get sortSelectValue(): string {
    return `${this.sortBy}:${this.sortOrder}`;
  }

  onSort(key: string): void {
    const n = applySortClick(this.sortBy, this.sortOrder, key);
    this.sortBy = n.sortBy;
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
      (by !== 'dni' && by !== 'apellido' && by !== 'nombre' && by !== 'fechaNacimiento') ||
      (ord !== 'asc' && ord !== 'desc')
    ) {
      return;
    }
    if (this.sortBy === by && this.sortOrder === ord) {
      return;
    }
    this.sortBy = by;
    this.sortOrder = ord;
    this.page = 1;
    this.load();
  }

  openCreate(): void {
    this.editing = null;
    this.saving = false;
    this.form.controls.clubDestinoInicialId.setValidators([Validators.min(1)]);
    this.form.controls.clubDestinoInicialId.updateValueAndValidity({ emitEvent: false });
    this.form.reset({
      clubDestinoInicialId: 0,
    });
    this.modalOpen = true;
    queueMicrotask(() => this.syncFechaNacimientoPickerFromForm());
  }

  openEdit(j: Jugador, ev: Event): void {
    ev.stopPropagation();
    this.editing = j;
    this.saving = false;
    this.form.controls.clubDestinoInicialId.clearValidators();
    this.form.controls.clubDestinoInicialId.updateValueAndValidity({ emitEvent: false });
    this.form.patchValue({
      dni: j.dni,
      nombre: j.nombre,
      apellido: j.apellido,
      telefono: j.telefono ?? '',
      fechaNacimiento: j.fechaNacimiento.slice(0, 10),
      nacionalidad: j.nacionalidad ?? '',
      clubDestinoInicialId: 0,
    });
    this.modalOpen = true;
    queueMicrotask(() => this.syncFechaNacimientoPickerFromForm());
  }

  closeModal(): void {
    this.modalOpen = false;
    this.saving = false;
    this.destroyFechaNacimientoDatepicker();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      dni: v.dni,
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono || undefined,
      fechaNacimiento: v.fechaNacimiento,
      nacionalidad: v.nacionalidad?.trim() || undefined,
    };
    const req = this.editing
      ? this.api.update(this.editing.id, body)
      : this.api.create({
          ...body,
          clubDestinoInicialId: v.clubDestinoInicialId,
        });
    this.saving = true;
    req
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
          this.closeModal();
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
  }

  remove(j: Jugador, ev: Event): void {
    ev.stopPropagation();
    void Swal.fire({
      title: '¿Eliminar jugador?',
      text: `${j.apellido}, ${j.nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.api.delete(j.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
          this.load();
        },
        error: (e) => this.apiErrorAlert(e),
      });
    });
  }

  goDetail(j: Jugador): void {
    void this.router.navigate(['/pages/jugadores', j.id]);
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

  /** Solo permite dígitos.  se usa en el input de dni.*/
  onDniKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const allowedKeys = new Set([
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
    ]);
    if (allowedKeys.has(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Solo permite dígitos.  se usa en el input de dni.*/
  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const onlyDigits = input.value.replace(/\D+/g, '');
    if (input.value !== onlyDigits) {
      input.value = onlyDigits;
    }
    this.form.controls.dni.setValue(onlyDigits, { emitEvent: false });
  }

  formatDate = formatDateOnly;

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  onFechaNacimientoBlur(): void {
    this.form.controls.fechaNacimiento.markAsTouched();
  }

  private initFechaNacimientoDatepicker(): void {
    const input = this.fechaNacimientoInput?.nativeElement;
    if (!input || this.fechaNacimientoDatepicker) return;
    this.fechaNacimientoDatepicker = new FlowbiteDatepicker(input, {
      autohide: true,
      format: 'dd/mm/yyyy',
      minDate: new Date(1900, 0, 1),
      maxDate: new Date(),
      buttons: true,
      autoSelectToday: false,
    });
    input.addEventListener('changeDate', this.onFechaNacimientoChange as EventListener);
    this.syncFechaNacimientoPickerFromForm();
  }

  private destroyFechaNacimientoDatepicker(): void {
    const input = this.fechaNacimientoInput?.nativeElement;
    if (input) {
      input.removeEventListener('changeDate', this.onFechaNacimientoChange as EventListener);
    }
    if (this.fechaNacimientoDatepicker) {
      this.fechaNacimientoDatepicker.destroy?.();
      this.fechaNacimientoDatepicker = null;
    }
  }

  private readonly onFechaNacimientoChange = (): void => {
    const selected = this.fechaNacimientoDatepicker?.getDate() as string | Date | undefined;
    if (!selected) {
      this.form.controls.fechaNacimiento.setValue('');
      this.form.controls.fechaNacimiento.markAsTouched();
      return;
    }
    let year: number;
    let month: number;
    let day: number;
    if (selected instanceof Date) {
      if (Number.isNaN(selected.getTime())) {
        this.form.controls.fechaNacimiento.setValue('');
        this.form.controls.fechaNacimiento.markAsTouched();
        return;
      }
      year = selected.getFullYear();
      month = selected.getMonth() + 1;
      day = selected.getDate();
    } else {
      const parts = selected.split('/');
      if (parts.length !== 3) {
        this.form.controls.fechaNacimiento.setValue('');
        this.form.controls.fechaNacimiento.markAsTouched();
        return;
      }
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
      if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
        this.form.controls.fechaNacimiento.setValue('');
        this.form.controls.fechaNacimiento.markAsTouched();
        return;
      }
    }
    const yyyy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.form.controls.fechaNacimiento.setValue(`${yyyy}-${mm}-${dd}`);
    this.form.controls.fechaNacimiento.markAsTouched();
  };

  private syncFechaNacimientoPickerFromForm(): void {
    const iso = this.form.controls.fechaNacimiento.value;
    if (!this.fechaNacimientoDatepicker) return;
    if (!iso) {
      this.fechaNacimientoDatepicker.setDate('', { clear: true });
      return;
    }
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) {
      this.fechaNacimientoDatepicker.setDate('', { clear: true });
      return;
    }
    const display = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`;
    this.fechaNacimientoDatepicker.setDate(display);
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
