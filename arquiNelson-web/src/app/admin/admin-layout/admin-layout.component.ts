import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  constructor(private auth: AdminAuthService, private router: Router) {}

  get user() {
    return this.auth.user();
  }

  get canManageUsers() {
    return this.auth.canManageUsers();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
