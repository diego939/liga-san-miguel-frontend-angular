import { Directive, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Muestra la plantilla solo si el usuario **no** es OPERADOR.
 * Uso: `<button *appIfNotOperador>...</button>`
 */
@Directive({
  selector: '[appIfNotOperador]',
  standalone: true,
})
export class IfNotOperadorDirective {
  constructor() {
    const tpl = inject(TemplateRef<unknown>);
    const vc = inject(ViewContainerRef);
    const auth = inject(AuthService);
    if (!auth.esOperador()) {
      vc.createEmbeddedView(tpl);
    }
  }
}
