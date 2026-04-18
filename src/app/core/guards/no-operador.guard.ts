import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

function findTorneoId(route: ActivatedRouteSnapshot): string | null {
  let r: ActivatedRouteSnapshot | null = route;
  while (r) {
    const id = r.paramMap.get('torneoId');
    if (id) return id;
    r = r.parent;
  }
  return null;
}

/** Bloquea el acceso a la ruta si el usuario es OPERADOR (redirige al listado de partidos del torneo). */
export const noOperadorGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.esOperador()) {
    return true;
  }
  const torneoId = findTorneoId(route);
  if (torneoId) {
    return router.createUrlTree(['/pages/torneos', torneoId, 'partidos']);
  }
  return router.createUrlTree(['/pages/torneos']);
};
