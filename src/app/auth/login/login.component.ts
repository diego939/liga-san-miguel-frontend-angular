import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ ReactiveFormsModule, CommonModule ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  errorMessage: string = '';
  loading = false;
  showPassword = false;

  form = this.fb.group({
    email: [''],
    password: ['']
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private menuService: MenuService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
  if (this.form.invalid) return;

  this.loading = true;
  this.errorMessage = '';

  const { email, password } = this.form.getRawValue();
  this.authService
    .login({ email: email ?? '', password: password ?? '' })
    .subscribe({
    next: (res) => {
      this.authService.guardarUsuario(res.user);
      this.menuService.inicializarMenusLiga();
      this.loading = false;

      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'success',
        title: `¡Bienvenido ${res.user.email}!`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      this.router.navigateByUrl('/pages/torneos');
    },
    error: (err) => {
      this.loading = false;

      const backendMessage = err?.error?.message;
      if (Array.isArray(backendMessage)) {
        this.errorMessage = backendMessage.join('. ');
        return;
      }

      this.errorMessage =
        (typeof backendMessage === 'string' ? backendMessage : '') ||
        (typeof err?.error === 'string' ? err.error : '') ||
        'Error al iniciar sesión';
    },
  });
  }
}