import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, NgZone } from '@angular/core';
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
  private sessionId = '';

  constructor(
    private chatbot: ChatbotService,
    @Inject(PLATFORM_ID) platformId: object,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.sessionId = this.generateId();
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
      this.runInZone(() => {
        this.addMessage('bot', reply);
      });
    } catch {
      this.runInZone(() => {
        this.error = 'No se pudo enviar el mensaje. Intenta de nuevo.';
      });
    } finally {
      this.runInZone(() => {
        this.isSending = false;
      });
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
  }

  private runInZone(action: () => void) {
    if (this.isBrowser) {
      this.zone.run(() => {
        action();
        this.cdr.detectChanges();
      });
      return;
    }
    action();
  }

  private generateId() {
    if (this.isBrowser && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
