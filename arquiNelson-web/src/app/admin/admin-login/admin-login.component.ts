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

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/admin']);
      return;
    }
    this.loadStats();
  }

  async submit() {
    this.error = '';
    this.loading = true;
    const success = await this.auth.login(this.email, this.password);
    this.loading = false;
    if (!success) {
      this.error = 'Credenciales invalidas.';
      return;
    }
    this.router.navigate(['/admin']);
  }

  private async loadStats() {
    this.statsLoading = true;
    this.stats = await this.data.getPublicDashboardStats();
    this.statsLoading = false;
    this.cdr.detectChanges();
  }
}
