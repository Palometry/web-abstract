import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  @Input() title?: string;
  @Input() summary?: string;
  @Input() cards?: { title: string; body: string }[];

  defaultTitle = 'Sobre Nosotros';
  defaultSummary =
    'ArquiNelson es una firma dedicada a ofrecer soluciones inmobiliarias integrales con estándares internacionales, combinando diseño, calidad constructiva y compromiso social y ambiental.';

  defaultCards = [
    {
      title: 'Misión',
      body:
        'Brindar proyectos inmobiliarios innovadores y sostenibles que mejoren la calidad de vida de nuestras comunidades y generen valor a nuestros clientes.'
    },
    {
      title: 'Visión',
      body:
        'Ser reconocidos como referentes en desarrollo inmobiliario en la región, impulsando prácticas responsables y diseños de excelencia.'
    },
    {
      title: 'Objetivos',
      body:
        'Entregar proyectos a tiempo y con altos estándares de calidad. Integrar criterios de sostenibilidad en todos los desarrollos. Fomentar el bienestar y la seguridad de nuestros clientes y colaboradores.'
    }
  ];

  get displayCards() {
    return this.cards?.length ? this.cards : this.defaultCards;
  }
}
