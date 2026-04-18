import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: number;
  email: string;
  rolId: number;
  /** `Rol.descripcion` en BD (p. ej. ADMIN, OPERADOR). Opcional hasta sincronizar vía login o `/auth/me`. */
  rolDescripcion?: string;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/api/auth/login`, data)
      .pipe(
        tap((res) => {
          if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem('access_token', res.access_token);
            sessionStorage.setItem('user', JSON.stringify(res.user));
          }
        }),
      );
  }

  guardarUsuario(user: AuthUser): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('user', JSON.stringify(user));
    }
  }

  obtenerUsuario(): AuthUser | null {
    if (isPlatformBrowser(this.platformId)) {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  obtenerToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return sessionStorage.getItem('access_token');
    }
    return null;
  }

  isLogged(): boolean {
    return !!(this.obtenerToken() && this.obtenerUsuario());
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.clear();
    }
  }

  /** Sincroniza usuario en sesión con el backend (p. ej. tras desplegar o cambiar rol). */
  refreshUsuarioSesion(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/api/auth/me`).pipe(
      tap((user) => this.guardarUsuario(user)),
    );
  }
}
