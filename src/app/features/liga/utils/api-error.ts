import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

/** Mensaje del cuerpo de error HTTP (Nest: `message` string | string[]). */
export function apiErrorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
  }
  const body = err.error;
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if ('message' in o && o['message'] != null) {
      const m = o['message'];
      if (Array.isArray(m)) {
        return m.map(String).filter(Boolean).join('\n');
      }
      if (typeof m === 'string') {
        return m;
      }
    }
    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }
  if (body == null || body === '') {
    return '';
  }
  return String(body);
}

export function apiErrorAlert(err: unknown): void {
  void Swal.fire({
    icon: 'error',
    text: apiErrorMessage(err),
  });
}
