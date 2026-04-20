/** Respuesta paginada estándar del backend Nest. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type TipoPase = 'TEMPORAL' | 'DEFINITIVO';
export type TipoEvento = 'GOL' | 'GOL_EN_CONTRA' | 'AMARILLA' | 'ROJA';
export type EstadoPartido = 'PENDIENTE' | 'EN_JUEGO' | 'FINALIZADO';

export interface Rol {
  id: number;
  descripcion: string;
}

export interface Usuario {
  id: number;
  email: string;
  rolId: number;
  rol?: Rol;
}

export interface Jugador {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  fechaNacimiento: string;
  createdAt?: string;
  nacionalidad?: string | null;
}

export interface Club {
  id: number;
  nombre: string;
  logo?: string | null;
}

export interface ClubPersonal {
  id: number;
  clubId: number;
  tipo: string;
  nombre: string;
  dni?: string | null;
  telefono?: string | null;
}

export interface Pase {
  id: number;
  jugadorId: number;
  /** Ausente o null en altas iniciales (sin club previo). */
  clubOrigenId?: number | null;
  clubDestinoId: number;
  tipo: TipoPase;
  fechaInicio: string;
  fechaFin?: string | null;
  jugador?: Jugador;
  clubOrigen?: Club;
  clubDestino?: Club;
}

export interface Torneo {
  id: number;
  nombre: string;
  categoria: string;
  formato: string;
  fechaInicio: string;
  fechaFin: string;
  limiteForaneos?: number | null;
  maxJugadores: number;
}

export interface EquipoTorneo {
  id: number;
  torneoId: number;
  clubId: number;
  club: Club;
  torneo?: Torneo;
  jugadoresInscriptosActivos?: number;
}

export interface Inscripcion {
  id: number;
  jugadorId: number;
  equipoTorneoId: number;
  esForaneo: boolean;
  fechaInicio: string;
  fechaFin?: string | null;
  jugador?: Jugador;
  equipoTorneo?: EquipoTorneo;
}

/** Respuesta de GET …/inscripciones (lista de buena fe + contexto de club). */
export interface InscripcionesListaBuenaFeResponse extends Paginated<Inscripcion> {
  clubId: number;
  clubNombre: string;
  torneoNombre: string;
}

/** Jugadores elegibles para agregar a la LBF (pase al club del equipo). */
export interface CandidatosInscripcionResponse extends Paginated<Jugador> {
  clubId: number;
  clubNombre: string;
  torneoNombre: string;
}

export interface Partido {
  id: number;
  torneoId: number;
  equipoLocalId: number;
  equipoVisitanteId: number;
  fecha: string;
  golesLocal: number;
  golesVisitante: number;
  estado: EstadoPartido;
  capitanLocalJugadorId?: number | null;
  capitanVisitanteJugadorId?: number | null;
  capitanLocalJugador?: Jugador | null;
  capitanVisitanteJugador?: Jugador | null;
  arbitroPrincipal?: string | null;
  juezLinea1?: string | null;
  juezLinea2?: string | null;
  observaciones?: string | null;
  torneo?: Torneo;
  equipoLocal?: EquipoTorneo & { club: Club };
  equipoVisitante?: EquipoTorneo & { club: Club };
}

export interface PartidoJugadorLinea {
  id: number;
  partidoId: number;
  jugadorId: number;
  equipoId: number;
  titular: boolean;
  numeroCamiseta?: number | null;
  jugador?: Jugador;
  equipo?: EquipoTorneo & { club: Club };
}

export interface EventoPartido {
  id: number;
  partidoId: number;
  jugadorId: number;
  tipo: TipoEvento;
  minuto: number;
  notas?: string | null;
  jugador?: Jugador;
}

export interface CambioPartido {
  id: number;
  partidoId: number;
  jugadorSaleId: number;
  jugadorEntraId: number;
  minuto: number;
  jugadorSale?: Jugador;
  jugadorEntra?: Jugador;
}

export interface Suspension {
  id: number;
  jugadorId: number;
  torneoId: number;
  motivo: string;
  partidosRestantes: number;
  jugador?: Jugador;
  torneo?: Torneo;
}

export interface TablaPosicionRow {
  equipoTorneoId: number;
  clubNombre: string;
  puntos: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dif: number;
}

export interface GoleadorRow {
  jugadorId: number;
  goles: number;
  jugador: Jugador | null;
  clubNombre: string | null;
}

export interface PreviewInscripcion {
  puede: boolean;
  motivo: string | null;
}

export interface PreviewPlanilla {
  puede: boolean;
  esForaneo: boolean;
  motivo: string | null;
}
