import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { menuGuard } from './core/guards/menu.guard';
import { noOperadorGuard } from './core/guards/no-operador.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'pages',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: 'jugadores',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/jugadores/jugadores-list.component').then(
            (m) => m.JugadoresListComponent,
          ),
      },
      {
        path: 'jugadores/:id',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/jugadores/jugador-detail.component').then(
            (m) => m.JugadorDetailComponent,
          ),
      },
      {
        path: 'pases',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/pases/pases-list.component').then(
            (m) => m.PasesListComponent,
          ),
      },
      {
        path: 'clubes',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/clubes/clubes-list.component').then(
            (m) => m.ClubesListComponent,
          ),
      },
      {
        path: 'clubes/:id',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/clubes/club-detail.component').then(
            (m) => m.ClubDetailComponent,
          ),
      },
      {
        path: 'torneos',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/torneos/torneos-list.component').then(
            (m) => m.TorneosListComponent,
          ),
      },
      {
        path: 'torneos/:torneoId',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/torneos/torneo-shell.component').then(
            (m) => m.TorneoShellComponent,
          ),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'equipos' },
          {
            path: 'equipos/:equipoTorneoId/inscripciones',
            loadComponent: () =>
              import(
                './features/liga/pages/torneos/torneo-inscripciones.component'
              ).then((m) => m.TorneoInscripcionesComponent),
          },
          {
            path: 'equipos',
            loadComponent: () =>
              import('./features/liga/pages/torneos/torneo-equipos.component').then(
                (m) => m.TorneoEquiposComponent,
              ),
          },
          {
            path: 'partidos/:partidoId/planilla',
            canActivate: [noOperadorGuard],
            loadComponent: () =>
              import(
                './features/liga/pages/torneos/planilla-partido.component'
              ).then((m) => m.PlanillaPartidoComponent),
          },
          {
            path: 'partidos',
            loadComponent: () =>
              import(
                './features/liga/pages/torneos/torneo-partidos.component'
              ).then((m) => m.TorneoPartidosComponent),
          },
          {
            path: 'estadisticas',
            loadComponent: () =>
              import(
                './features/liga/pages/torneos/torneo-estadisticas.component'
              ).then((m) => m.TorneoEstadisticasComponent),
          },
        ],
      },
      {
        path: 'suspensiones',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/admin/suspensiones-list.component').then(
            (m) => m.SuspensionesListComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/admin/usuarios-list.component').then(
            (m) => m.UsuariosListComponent,
          ),
      },
      {
        path: 'roles',
        canActivate: [menuGuard],
        loadComponent: () =>
          import('./features/liga/pages/admin/roles-list.component').then(
            (m) => m.RolesListComponent,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'torneos' },
    ],
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
