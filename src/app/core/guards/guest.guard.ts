import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MenuService } from '../services/menu.service';

/** En el navegador, si ya hay sesión no se muestra el login (evita parpadeo al ir a `/login`). */
export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const menu = inject(MenuService);
  if (!auth.isLogged()) {
    return true;
  }
  menu.cargarDesdeStorage();
  const menus = menu.obtenerMenus();
  const first = menus.find((m) => m.menuUrl)?.menuUrl ?? '/pages/torneos';
  return router.createUrlTree([first]);
};
