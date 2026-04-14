import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MenuService } from '../services/menu.service';

/** Comprueba la ruta contra el menú estático de Liga (no hay menús en BD). */
export const menuGuard: CanActivateFn = (_route, state) => {
  const menuService = inject(MenuService);
  const router = inject(Router);

  if (menuService.isPathAllowed(state.url)) {
    return true;
  }

  return router.createUrlTree(['/pages/torneos']);
};