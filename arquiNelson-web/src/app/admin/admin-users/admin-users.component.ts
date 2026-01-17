import { AfterViewInit, ChangeDetectorRef, Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminAuthService, AdminUser } from '../../services/admin-auth';

type RoleOption = { key: string; label: string };

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent {
  users: AdminUser[] = [];
  error = '';
  loading = false;
  private loaded = false;
  private readonly isBrowser: boolean;

  roles: RoleOption[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'editor', label: 'Editor' },
    { key: 'client', label: 'Cliente' },
    { key: 'editor_user_manager', label: 'Editor - usuarios' }
  ];

  newUser = {
    fullName: '',
    email: '',
    password: '',
    roles: ['client'] as string[]
  };

  constructor(
    private auth: AdminAuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.tryLoad();
  }

  ngAfterViewInit() {
    this.tryLoad();
  }

  get canCreate() {
    return this.auth.canManageUsers();
  }

  toggleRole(roleKey: string) {
    if (!this.canCreate) {
      return;
    }
    if (this.newUser.roles.includes(roleKey)) {
      this.newUser.roles = this.newUser.roles.filter((role) => role !== roleKey);
      return;
    }
    this.newUser.roles = [...this.newUser.roles, roleKey];
  }

  isRoleSelected(roleKey: string) {
    return this.newUser.roles.includes(roleKey);
  }

  async createUser() {
    if (!this.canCreate) {
      return;
    }
    this.error = '';
    const result = await this.auth.createUser(this.newUser);
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo crear el usuario.';
      return;
    }
    this.newUser = { fullName: '', email: '', password: '', roles: ['client'] };
    this.refreshUsers();
  }

  async setActive(user: AdminUser, active: boolean) {
    if (!this.canCreate) {
      return;
    }
    if (!active && this.isLastAdmin(user)) {
      this.error = 'Debes asignar otro admin antes de desactivar este usuario.';
      return;
    }
    await this.auth.setUserActive(user.id, active);
    this.refreshUsers();
  }

  private async refreshUsers() {
    this.loading = true;
    try {
      this.users = await this.auth.listUsers();
      if (this.error) {
        this.error = '';
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async tryLoad() {
    if (!this.isBrowser || this.loaded) {
      return;
    }
    this.loaded = true;
    await this.refreshUsers();
  }

  isLastAdmin(user: AdminUser) {
    if (!user.roles.includes('admin') || !user.active) {
      return false;
    }
    const activeAdmins = this.users.filter(
      (item) => item.active && item.roles.includes('admin')
    );
    return activeAdmins.length <= 1;
  }
}
