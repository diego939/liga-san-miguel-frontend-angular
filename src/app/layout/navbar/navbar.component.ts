import { Component, HostListener } from '@angular/core';
import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
constructor(
  private layoutService: LayoutService,
  private authService: AuthService,
  private router: Router
) {}

isUserMenuOpen = false;

emailUsuario = this.authService.obtenerUsuario()?.email || 'Usuario';

ngOnInit() {
  this.layoutService.userMenuOpen$.subscribe(v => this.isUserMenuOpen = v);
}

toggleSidebar() {
  this.layoutService.toggleSidebar();
}

toggleUserMenu() {
  this.layoutService.toggleUserMenu();
}

logout() {
  this.toggleSidebar(); // Cerrar el sidebar al hacer logout
  this.toggleUserMenu(); // Cerrar el menú de usuario al hacer logout
  this.authService.logout();
  this.router.navigate(['/login']);
}

@HostListener('document:click', ['$event'])
onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;

  const clickedInsideDropdown = target.closest('.user-menu');
  const clickedButton = target.closest('.user-button');

  if (!clickedInsideDropdown && !clickedButton) {
    this.isUserMenuOpen = false;
  }
}
}
