import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth';
import { AdminDataService, AdminPublicDashboardStats } from '../../services/admin-data';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent implements OnInit {
  email = '';
  password = '';
  rememberSession = false;
  showPassword = false;
  error = '';
  loading = false;
  statsLoading = false;
  stats: AdminPublicDashboardStats = { activeProjects: 0, newQuotes: 0 };

  constructor(
    private auth: AdminAuthService,
    private data: AdminDataService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/admin']);
      return;
    }
    this.loadStats();
  }

  async submit() {
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();
    const result = await this.auth.login(this.email, this.password, this.rememberSession);
    this.loading = false;
    if (!result.ok) {
      this.error =
        result.reason === 'invalid_credentials'
          ? 'Credenciales invalidas.'
          : result.reason === 'server_error'
            ? 'El servidor no pudo iniciar sesion. Revisa la configuracion del backend.'
            : 'No se pudo conectar con el servidor.';
      this.cdr.detectChanges();
      return;
    }
    this.cdr.detectChanges();
    this.router.navigate(['/admin']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private async loadStats() {
    this.statsLoading = true;
    this.stats = await this.data.getPublicDashboardStats();
    this.statsLoading = false;
    this.cdr.detectChanges();
  }
}
