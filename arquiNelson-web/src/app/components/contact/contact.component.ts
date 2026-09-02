import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  readonly email = 'dazanelson8@gmail.com';
  readonly phoneLabel = '+51 956 639 199';
  readonly phoneLink = 'tel:+51956639199';
  readonly whatsappLink = 'https://wa.me/51956639199';
  readonly advisoryQrSrc = 'img/codigo-qr.jpeg';
  readonly advisoryPaymentName = 'Paolo Daza Tello';
  readonly advisoryInitialFee = 'S/ 25';
  readonly advisoryFinalFee = 'S/ 25';
  readonly advisoryWhatsappLink =
      'https://wa.me/51956639199?text=' +
    encodeURIComponent(
      'Hola, ya realice el primer pago de S/ 25 por Yape y quiero agendar mi asesoria. Les comparto mi comprobante para coordinar fecha y hora por WhatsApp.'
    );
  readonly placeName = 'Abstract Arquitectura';
  readonly address = 'Jr. Manuel del Aguila, Moyobamba 22001, Peru';
  readonly schedule = 'Lunes a Viernes: 9:00 - 18:00';
  readonly mapQuery = `${this.placeName}, ${this.address}`;
  readonly mapsLink =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(this.mapQuery);
  readonly mapEmbedUrl: SafeResourceUrl;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  formModel = {
    fullName: '',
    email: '',
    phone: '',
    message: ''
  };

  constructor(
    private sanitizer: DomSanitizer,
    private contactService: ContactService
  ) {
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${encodeURIComponent(this.mapQuery)}&z=17&output=embed`
    );
  }

  async submitContact(form: NgForm): Promise<void> {
    if (form.invalid) {
      Object.values(form.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';

    try {
      const response = await this.contactService.send(this.formModel);
      this.submitSuccess =
        response.message || 'Tu mensaje fue enviado correctamente. Te responderemos pronto.';
      this.formModel = {
        fullName: '',
        email: '',
        phone: '',
        message: ''
      };
      form.resetForm(this.formModel);
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      this.submitError =
        httpError.error?.message ||
        'No se pudo enviar el mensaje en este momento. Intenta de nuevo.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
