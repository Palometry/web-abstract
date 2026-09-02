import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

type ChatbotResponse = {
  output?: string;
  reply?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = `${API_BASE_URL}/chat`;

  constructor(private http: HttpClient) {}

  async sendMessage(sessionId: string, message: string): Promise<string> {
    const payload = {
      sessionId,
      action: 'sendMessage',
      chatInput: message
    };

    const response = await firstValueFrom(this.http.post<ChatbotResponse | string>(this.apiUrl, payload));

    if (typeof response === 'string') {
      return response;
    }

    const reply = response.output || response.reply || response.message;
    if (!reply) {
      throw new Error('Chat response is empty');
    }

    return reply;
  }
}
