import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth';

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

  constructor(private auth: AdminAuthService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/admin']);
    }
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
}
