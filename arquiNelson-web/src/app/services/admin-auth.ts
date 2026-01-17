import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type StoredUser = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  phone?: string | null;
  active?: boolean;
};

export type AdminUser = StoredUser;

const STORAGE_KEYS = {
  token: 'arqui_admin_token'
};

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly userSignal = signal<AdminUser | null>(null);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = 'http://localhost:4001/api';

  constructor() {
    this.restoreSession();
  }

  get user() {
    return this.userSignal;
  }

  isLoggedIn(): boolean {
    return this.userSignal() !== null || this.hasToken();
  }

  canManageUsers(): boolean {
    const user = this.userSignal();
    if (!user) {
      return false;
    }
    return user.roles.includes('admin') || user.roles.includes('editor_user_manager');
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await firstValueFrom(
        this.http.post<{ token: string; user: AdminUser }>(`${this.apiBaseUrl}/auth/login`, {
          email: normalizedEmail,
          password
        })
      );
      this.setToken(response.token);
      this.userSignal.set(response.user);
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(STORAGE_KEYS.token);
    this.userSignal.set(null);
  }

  async listUsers(): Promise<AdminUser[]> {
    if (!this.isBrowser) {
      return [];
    }
    try {
      const response = await firstValueFrom(
        this.http.get<AdminUser[]>(`${this.apiBaseUrl}/users`, {
          headers: this.authHeaders()
        })
      );
      return response;
    } catch {
      return [];
    }
  }

  async createUser(payload: {
    fullName: string;
    email: string;
    password: string;
    roles: string[];
  }): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    const fullName = payload.fullName.trim();
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;
    if (!fullName || !email || !password) {
      return { ok: false, error: 'Completa todos los campos requeridos.' };
    }
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiBaseUrl}/users`,
          {
            fullName,
            email,
            password,
            roles: payload.roles.length ? payload.roles : ['client']
          },
          { headers: this.authHeaders() }
        )
      );
      return { ok: true };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'El correo ya existe.' };
      }
      return { ok: false, error: 'No se pudo crear el usuario.' };
    }
  }

  async setUserActive(userId: number, active: boolean) {
    if (!this.isBrowser) {
      return;
    }
    await firstValueFrom(
      this.http.patch(
        `${this.apiBaseUrl}/users/${userId}/status`,
        { active },
        { headers: this.authHeaders() }
      )
    );
  }

  private async restoreSession() {
    if (!this.isBrowser) {
      return;
    }
    const token = this.getToken();
    if (!token) {
      return;
    }
    try {
      const response = await firstValueFrom(
        this.http.get<AdminUser & { isActive?: boolean }>(`${this.apiBaseUrl}/auth/me`, {
          headers: this.authHeaders()
        })
      );
      const user: AdminUser = {
        id: response.id,
        email: response.email,
        fullName: response.fullName,
        roles: response.roles,
        phone: response.phone,
        active: typeof response.isActive === 'boolean' ? response.isActive : response.active
      };
      this.userSignal.set(user);
    } catch {
      this.clearToken();
      this.userSignal.set(null);
    }
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  private getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(STORAGE_KEYS.token);
  }

  private setToken(token: string) {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.token, token);
  }

  private clearToken() {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(STORAGE_KEYS.token);
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }
}
