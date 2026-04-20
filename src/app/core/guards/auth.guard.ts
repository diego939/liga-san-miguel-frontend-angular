import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * En SSR no hay `sessionStorage`: si redirigimos a login en el servidor, al hidratar
 * en el navegador se ve un flash de login aunque la sesión sea válida.
 * La comprobación real solo corre en el browser.
 */
export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLogged()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};