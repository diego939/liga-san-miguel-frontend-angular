# Sistema Liga San Miguel — Frontend (Angular)

Cliente web del sistema de gestión de la liga: jugadores, clubes, pases, torneos (equipos, partidos, planillas, estadísticas) y administración básica (usuarios, roles, suspensiones). Consume el API NestJS bajo el prefijo `/api`.

Stack: **Angular 17**, aplicación **standalone** (sin `NgModule` de feature), rutas con lazy loading y guards.

---

## Estructura del proyecto (`src/app`)

| Carpeta / área | Rol |
|----------------|-----|
| `auth/login` | Pantalla de inicio de sesión; redirige a `/pages` tras autenticarse. |
| `core/` | Infraestructura transversal: `AuthService`, `authGuard`, `menuGuard`, `MenuService`, interceptor JWT (`interceptors/auth.interceptor.ts`), modelos/servicios heredados de otros proyectos si aplica. |
| `layout/` | Shell autenticado: `main-layout` (navbar + sidebar + `<router-outlet>`), `sidebar` (menú Liga), `navbar`. |
| `features/liga/` | **Dominio Liga**: pantallas, servicios HTTP hacia el backend y utilidades (`utils/`, `shared/`, `models/api.types.ts`). |

### Dominio `features/liga`

```
features/liga/
├── models/api.types.ts     # Tipos alineados al API (DTOs principales)
├── services/*-api.service.ts  # Clientes HTTP por recurso
├── shared/                   # Componentes reutilizables (paginación, UI modal, etc.)
├── utils/                    # Formato de fechas, estado de pase, orden de columnas, etc.
└── pages/
    ├── jugadores/            # Listado y ficha de jugador
    ├── clubes/               # Listado y detalle de club
    ├── pases/                # Listado, alta y renovación de pases
    ├── torneos/              # Torneos + shell del torneo (equipos, inscripciones, partidos, planilla, estadísticas)
    └── admin/                # Suspensiones, usuarios, roles
```

---

## Rutas y funcionalidades (lo acordado hasta ahora)

Las rutas viven en `app/app.routes.ts`. Tras login, la app navega a **`/pages`** (por defecto redirige a **`/pages/torneos`**).

| Ruta | Componente / módulo de pantalla | Funcionalidad |
|------|----------------------------------|---------------|
| `/login` | `auth/login` | Acceso al sistema; sesión y menú Liga se inicializan según `AuthService` / `MenuService`. |
| `/pages/jugadores` | `jugadores-list` | ABM/consulta de jugadores del registro de la liga. |
| `/pages/jugadores/:id` | `jugador-detail` | Ficha del jugador. |
| `/pages/pases` | `pases-list` | **Pases**: listado con filtros (club, estado), orden por columnas, paginación. **Alta**: búsqueda por DNI, selección origen/destino, tipo definitivo/temporal (fecha fin solo si es temporal), fechas con hora local. **Origen automático** al encontrar jugador: último pase **temporal activo** (club destino de ese pase) o, si no hay, último pase **definitivo**. **Renovación**: modal con datos del jugador y clubes del pase; conserva origen/destino del backend; fecha inicio por defecto en hora local; fecha fin solo si el tipo es temporal. |
| `/pages/clubes` | `clubes-list` | Listado de clubes afiliados. |
| `/pages/clubes/:id` | `club-detail` | Detalle del club (datos y contexto según implementación actual). |
| `/pages/torneos` | `torneos-list` | Listado de torneos; acceso al contexto de un torneo. |
| `/pages/torneos/:torneoId` | `torneo-shell` | Contenedor del torneo con pestañas/subrutas: |
| → `…/equipos` | `torneo-equipos` | Equipos inscriptos al torneo. |
| → `…/equipos/:equipoTorneoId/inscripciones` | `torneo-inscripciones` | **Lista de buena fe** / inscripciones del equipo en el torneo (altas, contexto de club, foráneos según reglas del API). |
| → `…/partidos` | `torneo-partidos` | Fixture / partidos del torneo. |
| → `…/partidos/:partidoId/planilla` | `planilla-partido` | **Planilla del partido** (carga de eventos, goles, tarjetas, etc., contra el API de partidos). |
| → `…/estadisticas` | `torneo-estadisticas` | Estadísticas agregadas del torneo. |
| `/pages/suspensiones` | `suspensiones-list` | Gestión/consulta de suspensiones. |
| `/pages/usuarios` | `usuarios-list` | Administración de usuarios del sistema. |
| `/pages/roles` | `roles-list` | Administración de roles. |

**Seguridad de navegación**

- `authGuard`: exige sesión para entrar a `/pages`.
- `menuGuard`: permite solo rutas bajo `/pages/…` que coinciden con el menú estático definido en `MenuService` (no hay menús dinámicos desde BD en este flujo).

---

## API y entorno

- URL base del backend: `environment.apiUrl` (por defecto `http://localhost:3000` en `src/environments/environment.ts`).
- Las llamadas REST usan `${apiUrl}/api/...` según cada `*-api.service.ts` en `features/liga/services/`.
- `appTimeZone` en environment documenta la zona horaria de negocio (vigencias, planillas); debe alinearse con el backend.

---

## Comandos útiles (Angular CLI)

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) 17.3.17.

```bash
npm install
ng serve
```

Navegá a `http://localhost:4200/`. La app recarga al cambiar archivos.

```bash
ng build          # Artefactos en dist/
ng test           # Unit tests (Karma)
```

Para ayuda del CLI: `ng help` o la [documentación del Angular CLI](https://angular.io/cli).
