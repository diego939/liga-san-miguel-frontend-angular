import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs/operators';
import type { Torneo } from '../../models/api.types';
import { TorneosApiService } from '../../services/torneos-api.service';

@Component({
  selector: 'app-torneo-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './torneo-shell.component.html',
})
export class TorneoShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TorneosApiService);

  torneoId!: number;
  torneo: Torneo | null = null;
  loading = true;

  ngOnInit(): void {
    this.torneoId = Number(this.route.snapshot.paramMap.get('torneoId'));
    this.api
      .get(this.torneoId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (t) => (this.torneo = t),
        error: () => (this.torneo = null),
      });
  }
}
