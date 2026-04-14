import { Component, OnInit } from '@angular/core';
import { MenuService } from '../../core/services/menu.service';
import { CommonModule, NgFor } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {

  menus: any[] = [];

  // 👇 AGREGAR ESTO
  isSidebarOpen = false;

  constructor(
  private menuService: MenuService,
  private authService: AuthService,
  private router: Router,
  private layoutService: LayoutService
) {}
ngOnInit() {
  this.menuService.menus$.subscribe(m => this.menus = m);
  this.menuService.cargarDesdeStorage();

  this.layoutService.sidebarOpen$.subscribe(v => this.isSidebarOpen = v);
}

closeAll() {
  this.layoutService.closeSidebar();
}

}
