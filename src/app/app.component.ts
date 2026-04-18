import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';
import { initFlowbite } from 'flowbite';
import { AuthService } from './core/services/auth.service';
import { MenuService } from './core/services/menu.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private auth: AuthService,
    private menuService: MenuService,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.auth.isLogged()) {
      this.auth.refreshUsuarioSesion().subscribe({
        next: () => this.menuService.cargarDesdeStorage(),
        error: () => {},
      });
    }
    const run = () => setTimeout(() => initFlowbite(), 0);
    run();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => run());
  }

  title = 'Liga San Miguel';
}
