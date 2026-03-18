import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface ContactPayload {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

export interface ContactResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(payload: ContactPayload): Promise<ContactResponse> {
    return firstValueFrom(
      this.http.post<ContactResponse>(`${API_BASE_URL}/contact`, payload)
    );
  }
}
