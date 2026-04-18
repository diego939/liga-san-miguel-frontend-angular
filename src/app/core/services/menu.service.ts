import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { esRolOperador } from '../utils/rol.utils';

/** Misma forma que el menú anterior (sidebar) para reutilizar el template. */
export interface MenuItem {
  menuNombre: string;
  menuUrl?: string;
  menuIcono?: string;
  children?: MenuItem[];
}

const LIGA_MENU: MenuItem[] = [
  {
    menuNombre: 'Jugadores',
    menuUrl: '/pages/jugadores',
    menuIcono: 'fa-solid fa-user-group',
  },
  {
    menuNombre: 'Pases',
    menuUrl: '/pages/pases',
    menuIcono: 'fa-solid fa-right-left',
  },
  {
    menuNombre: 'Clubes',
    menuUrl: '/pages/clubes',
    menuIcono: 'fa-solid fa-shield-halved',
  },
  {
    menuNombre: 'Torneos',
    menuUrl: '/pages/torneos',
    menuIcono: 'fa-solid fa-trophy',
  },
  {
    menuNombre: 'Suspensiones',
    menuUrl: '/pages/suspensiones',
    menuIcono: 'fa-solid fa-ban',
  },
  {
    menuNombre: 'Usuarios',
    menuUrl: '/pages/usuarios',
    menuIcono: 'fa-solid fa-user-gear',
  },
  {
    menuNombre: 'Roles',
    menuUrl: '/pages/roles',
    menuIcono: 'fa-solid fa-id-badge',
  },
];

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly auth = inject(AuthService);

  private menusSubject = new BehaviorSubject<MenuItem[]>([]);
  menus$ = this.menusSubject.asObservable();

  private buildLigaMenuForCurrentUser(): MenuItem[] {
    const user = this.auth.obtenerUsuario();
    if (esRolOperador(user?.rolDescripcion)) {
      return LIGA_MENU.filter(
        (m) =>
          m.menuUrl !== '/pages/usuarios' && m.menuUrl !== '/pages/roles',
      );
    }
    return [...LIGA_MENU];
  }

  /** Menú fijo según el dominio Liga (sin API de menús en BD). */
  inicializarMenusLiga(): void {
    const menus = this.buildLigaMenuForCurrentUser();
    this.menusSubject.next(menus);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('menus', JSON.stringify(menus));
    }
  }

  obtenerMenus(): MenuItem[] {
    if (this.auth.obtenerUsuario()) {
      return this.buildLigaMenuForCurrentUser();
    }
    const data = sessionStorage.getItem('menus');
    return data ? JSON.parse(data) : [];
  }

  cargarDesdeStorage(): void {
    if (typeof sessionStorage !== 'undefined') {
      if (this.auth.obtenerUsuario()) {
        const menus = this.buildLigaMenuForCurrentUser();
        this.menusSubject.next(menus);
        sessionStorage.setItem('menus', JSON.stringify(menus));
        return;
      }
      const data = sessionStorage.getItem('menus');
      if (data) {
        this.menusSubject.next(JSON.parse(data));
      }
    }
  }

  /** Rutas permitidas bajo /pages (JWT + menú estático). */
  isPathAllowed(url: string): boolean {
    const path = url.split('?')[0];
    if (!path.startsWith('/pages/')) {
      return false;
    }
    const roots = [
      '/pages/jugadores',
      '/pages/pases',
      '/pages/clubes',
      '/pages/torneos',
      '/pages/suspensiones',
      '/pages/usuarios',
      '/pages/roles',
    ];
    const operador = esRolOperador(this.auth.obtenerUsuario()?.rolDescripcion);
    if (
      operador &&
      (path === '/pages/usuarios' ||
        path.startsWith('/pages/usuarios/') ||
        path === '/pages/roles' ||
        path.startsWith('/pages/roles/'))
    ) {
      return false;
    }
    if (roots.some((r) => path === r || path.startsWith(r + '/'))) {
      return true;
    }
    return false;
  }
}
