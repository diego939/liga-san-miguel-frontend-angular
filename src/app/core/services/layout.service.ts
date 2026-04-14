import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {

  private sidebarOpen = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this.sidebarOpen.asObservable();

  private userMenuOpen = new BehaviorSubject<boolean>(false);
  userMenuOpen$ = this.userMenuOpen.asObservable();

  toggleSidebar() {
    this.sidebarOpen.next(!this.sidebarOpen.value);
  }

  closeSidebar() {
    this.sidebarOpen.next(false);
  }

  toggleUserMenu() {
    this.userMenuOpen.next(!this.userMenuOpen.value);
  }

  closeUserMenu() {
    this.userMenuOpen.next(false);
  }
}