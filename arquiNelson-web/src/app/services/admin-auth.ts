import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

type StoredUser = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  phone?: string | null;
  active?: boolean;
};

export type AdminUser = StoredUser;

export const ADMIN_AUTH_STORAGE_KEYS = {
  token: 'arqui_admin_token',
  expiresAt: 'arqui_admin_expires_at',
} as const;

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' | 'server_error' | 'network_error' };

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly userSignal = signal<AdminUser | null>(null);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = API_BASE_URL;
  private sessionRestorePromise: Promise<boolean> | null = null;

  constructor() {
    if (this.hasValidStoredSession()) {
      this.sessionRestorePromise = this.restoreSession();
    }
  }

  get user() {
    return this.userSignal;
  }

  isLoggedIn(): boolean {
    return this.userSignal() !== null;
  }

  canManageUsers(): boolean {
    const user = this.userSignal();
    if (!user) {
      return false;
    }
    return user.roles.includes('admin') || user.roles.includes('editor_user_manager');
  }

  async login(email: string, password: string, remember = false): Promise<AdminLoginResult> {
    if (!this.isBrowser) {
      return { ok: false, reason: 'network_error' };
    }
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await firstValueFrom(
        this.http.post<{ user: AdminUser; token: string; expiresAt: string }>(`${this.apiBaseUrl}/auth/login`, {
          email: normalizedEmail,
          password,
          remember
        })
      );
      this.userSignal.set(response.user);
      if (remember) {
        this.persistSession(response.token, response.expiresAt);
      } else {
        this.clearPersistedSession();
      }
      this.sessionRestorePromise = Promise.resolve(true);
      return { ok: true };
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      if (httpError.status === 401) {
        return { ok: false, reason: 'invalid_credentials' };
      }
      if (httpError.status >= 500) {
        return { ok: false, reason: 'server_error' };
      }
      return { ok: false, reason: 'network_error' };
    }
  }

  async logout(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    try {
      await firstValueFrom(this.http.post(`${this.apiBaseUrl}/auth/logout`, {}));
    } catch {
      // Clear the local session state even when the backend cookie is already gone.
    }
    this.userSignal.set(null);
    this.clearPersistedSession();
    this.sessionRestorePromise = null;
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

  async updateUser(
    userId: number,
    payload: {
      fullName: string;
      email: string;
      password?: string;
      roles: string[];
    }
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    const fullName = payload.fullName.trim();
    const email = payload.email.trim().toLowerCase();
    if (!fullName || !email) {
      return { ok: false, error: 'Completa los campos requeridos.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiBaseUrl}/users/${userId}`,
          {
            fullName,
            email,
            password: payload.password?.trim() ? payload.password.trim() : null,
            roles: payload.roles.length ? payload.roles : ['client']
          },
          { headers: this.authHeaders() }
        )
      );
      return { ok: true };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: error?.error?.error ?? 'El correo ya existe.' };
      }
      return { ok: false, error: 'No se pudo actualizar el usuario.' };
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

  async ensureSession(): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    if (this.userSignal()) {
      return true;
    }
    if (!this.hasValidStoredSession()) {
      return false;
    }
    if (this.sessionRestorePromise) {
      return this.sessionRestorePromise;
    }

    this.sessionRestorePromise = this.restoreSession();

    return this.sessionRestorePromise;
  }

  private async restoreSession(): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<AdminUser & { isActive?: boolean }>(`${this.apiBaseUrl}/auth/me`)
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
      return true;
    } catch {
      this.userSignal.set(null);
      this.clearPersistedSession();
      return false;
    } finally {
      this.sessionRestorePromise = null;
    }
  }

  private hasValidStoredSession(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const token = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.token);
    const expiresAt = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.expiresAt);

    if (!token || !expiresAt) {
      this.clearPersistedSession();
      return false;
    }

    const expiresAtMs = Date.parse(expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      this.clearPersistedSession();
      return false;
    }

    return true;
  }

  private persistSession(token: string, expiresAt: string): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.token, token);
    localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.expiresAt, expiresAt);
  }

  private clearPersistedSession(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEYS.expiresAt);
  }

  private authHeaders(): Record<string, string> {
    return {};
  }
}
