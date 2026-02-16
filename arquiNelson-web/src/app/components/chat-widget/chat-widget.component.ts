import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { ChatbotService } from '../../services/chatbot.service';

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
};

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent {
  isOpen = false;
  isSending = false;
  input = '';
  error = '';
  messages: ChatMessage[] = [];
  private readonly isBrowser: boolean;
  private readonly sessionKey = 'arqui_chat_session';
  private readonly messagesKey = 'arqui_chat_messages';
  private sessionId = '';

  constructor(
    private chatbot: ChatbotService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.sessionId = this.loadSessionId();
      this.messages = this.loadMessages();
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.addMessage('bot', 'Hola, soy el asistente virtual. ¿En qué puedo ayudarte?');
    }
  }

  async send() {
    const text = this.input.trim();
    if (!text || this.isSending) {
      return;
    }
    this.error = '';
    this.isSending = true;
    this.addMessage('user', text);
    this.input = '';

    try {
      const reply = await this.chatbot.sendMessage(this.sessionId, text);
      this.addMessage('bot', reply);
    } catch {
      this.error = 'No se pudo enviar el mensaje. Intenta de nuevo.';
    } finally {
      this.isSending = false;
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private addMessage(role: 'user' | 'bot', text: string) {
    const message: ChatMessage = {
      id: this.generateId(),
      role,
      text,
      timestamp: Date.now()
    };
    this.messages = [...this.messages, message].slice(-50);
    this.persistMessages();
  }

  private loadSessionId() {
    const stored = localStorage.getItem(this.sessionKey);
    if (stored) {
      return stored;
    }
    const id = this.generateId();
    localStorage.setItem(this.sessionKey, id);
    return id;
  }

  private loadMessages() {
    const stored = localStorage.getItem(this.messagesKey);
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as ChatMessage[];
      }
    } catch {
      return [];
    }
    return [];
  }

  private persistMessages() {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(this.messagesKey, JSON.stringify(this.messages));
  }

  private generateId() {
    if (this.isBrowser && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
