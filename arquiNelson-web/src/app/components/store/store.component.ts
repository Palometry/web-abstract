import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type StoreProduct = {
  id: number;
  code: string;
  title: string;
  category: string;
  software: string;
  priceFrom: number;
  delivery: string;
  format: string;
  support: string;
  idealFor: string;
  description: string;
  longDescription: string;
  includes: string[];
  extraDetails: { label: string; value: string }[];
  accent: string;
  surface: string;
  glow: string;
};

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './store.component.html',
  styleUrls: ['./store.component.scss']
})
export class StoreComponent {
  private readonly currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0
  });

  readonly whatsappNumber = '51956639199';
  readonly products: StoreProduct[] = [
    {
      id: 1,
      code: 'RVT-PLT-01',
      title: 'Plantilla Revit Arquitectonica Residencial',
      category: 'Plantillas Revit',
      software: 'Autodesk Revit',
      priceFrom: 149,
      delivery: 'Entrega digital inmediata',
      format: '.rte + manual PDF + archivos base',
      support: '3 meses de actualizacion',
      idealFor: 'proyectos residenciales, documentacion y estandarizacion BIM',
      description:
        'Plantilla base para arrancar proyectos de arquitectura en Revit con vistas, tablas, estilos, familias y configuraciones listas para producir mas rapido.',
      longDescription:
        'Este recurso esta pensado para estudios y profesionales que quieren comenzar un proyecto con un entorno BIM ordenado desde el primer dia. La plantilla puede servir como punto de partida para estandarizar documentacion, acelerar entregables y mantener consistencia grafica entre distintos proyectos del equipo.',
      includes: [
        'Navegador de proyecto organizado',
        'Vistas, laminas y tablas preconfiguradas',
        'Familias base de puertas, ventanas y mobiliario'
      ],
      extraDetails: [
        { label: 'Compatibilidad', value: 'Revit 2021 en adelante' },
        { label: 'Tipo de licencia', value: 'Uso interno para proyecto propio' },
        { label: 'Actualizaciones', value: 'Incluye mejoras por 3 meses' },
        { label: 'Entrega', value: 'Descarga digital con archivos organizados' }
      ],
      accent: '#9f3232',
      surface: 'linear-gradient(135deg, rgba(159, 50, 50, 0.18), rgba(16, 16, 16, 0.06))',
      glow: 'radial-gradient(circle at 75% 20%, rgba(159, 50, 50, 0.34), transparent 45%)'
    },
    {
      id: 2,
      code: 'RVT-FAM-02',
      title: 'Pack de Familias Revit Vivienda',
      category: 'Familias Revit',
      software: 'Autodesk Revit',
      priceFrom: 129,
      delivery: 'Entrega digital inmediata',
      format: '.rfa + catalogo PDF',
      support: '1 mes de soporte',
      idealFor: 'casas, departamentos, cocinas y espacios interiores',
      description:
        'Biblioteca de familias pensada para equipar proyectos residenciales con puertas, ventanas, muebles, accesorios y elementos listos para usar.',
      longDescription:
        'El paquete reune familias editables orientadas a vivienda y arquitectura interior. Se prioriza orden, limpieza de parametros y rapidez de colocacion para que puedas complementar proyectos sin empezar desde cero cada familia.',
      includes: [
        'Familias editables y ordenadas por tipologia',
        'Materiales base configurados',
        'Nombres y parametros consistentes para flujo BIM'
      ],
      extraDetails: [
        { label: 'Compatibilidad', value: 'Revit 2020 en adelante' },
        { label: 'Contenido', value: 'Puertas, ventanas, mobiliario y accesorios' },
        { label: 'Entrega', value: 'Pack descargable con catalogo PDF' },
        { label: 'Soporte', value: '1 mes para dudas de uso' }
      ],
      accent: '#5b6c7f',
      surface: 'linear-gradient(135deg, rgba(91, 108, 127, 0.18), rgba(255, 255, 255, 0.08))',
      glow: 'radial-gradient(circle at 70% 24%, rgba(91, 108, 127, 0.34), transparent 45%)'
    },
    {
      id: 3,
      code: 'RVT-PCK-03',
      title: 'Pack Revit Equipamiento Vivienda + Cocina',
      category: 'Packs BIM',
      software: 'Autodesk Revit',
      priceFrom: 189,
      delivery: 'Entrega digital inmediata',
      format: '.rfa + guia de uso + preview 3D',
      support: '2 meses de actualizacion',
      idealFor: 'arquitectura interior, cocinas, mobiliario fijo y equipamiento',
      description:
        'Conjunto ampliado de familias para proyectos de vivienda, cocinas y mobiliario interior con enfoque productivo y comercial.',
      longDescription:
        'Este pack agrupa categorias que normalmente se modelan una y otra vez en proyectos residenciales. La idea es reducir tiempos de arranque y permitir que el equipo concentre energia en decisiones de diseño, no en reconstruir bibliotecas base.',
      includes: [
        'Modulos de cocina y gabinetes',
        'Mobiliario fijo y suelto por ambientes',
        'Archivo de muestra para revisar contenido'
      ],
      extraDetails: [
        { label: 'Compatibilidad', value: 'Revit 2021 en adelante' },
        { label: 'Muestra', value: 'Incluye archivo preview de contenido' },
        { label: 'Categoria', value: 'Equipamiento de vivienda e interiores' },
        { label: 'Actualizaciones', value: '2 meses de mejoras menores' }
      ],
      accent: '#a66b28',
      surface: 'linear-gradient(135deg, rgba(166, 107, 40, 0.18), rgba(20, 16, 12, 0.06))',
      glow: 'radial-gradient(circle at 74% 18%, rgba(166, 107, 40, 0.36), transparent 42%)'
    },
    {
      id: 4,
      code: 'RND-EXT-04',
      title: 'Render Exterior Residencial',
      category: 'Renders AutoCAD',
      software: 'AutoCAD + postproduccion',
      priceFrom: 280,
      delivery: '48 a 72 horas',
      format: 'JPG 4K + portada web',
      support: '2 rondas de ajuste',
      idealFor: 'fachadas, preventa y brochure',
      description:
        'Imagen exterior con vegetacion, materiales y atmosfera de venta para presentar un proyecto con impacto inmediato.',
      longDescription:
        'Servicio pensado para proyectos que necesitan una imagen hero de venta. Se trabaja sobre base AutoCAD y referencias visuales del cliente para obtener una pieza lista para brochure, landing, pauta o presentacion comercial.',
      includes: [
        'Limpieza base del modelo AutoCAD',
        'Iluminacion diurna o golden hour',
        'Postproduccion lista para redes'
      ],
      extraDetails: [
        { label: 'Base requerida', value: 'Planos o modelo AutoCAD limpio' },
        { label: 'Entrega', value: 'Archivo final JPG en alta resolucion' },
        { label: 'Ajustes', value: '2 rondas de correccion incluidas' },
        { label: 'Uso ideal', value: 'Brochure, pauta y preventa' }
      ],
      accent: '#296a61',
      surface: 'linear-gradient(135deg, rgba(41, 106, 97, 0.18), rgba(10, 20, 18, 0.06))',
      glow: 'radial-gradient(circle at 78% 16%, rgba(41, 106, 97, 0.34), transparent 40%)'
    },
    {
      id: 5,
      code: 'RND-INT-05',
      title: 'Render Interior Premium',
      category: 'Renders AutoCAD',
      software: 'AutoCAD + postproduccion',
      priceFrom: 240,
      delivery: '36 a 48 horas',
      format: 'JPG 4K + close-up',
      support: '2 rondas de ajuste',
      idealFor: 'cocinas, salas, dormitorios y amenidades',
      description:
        'Vista interior para destacar materiales, luz y distribucion, con un enfoque mas editorial y comercial.',
      longDescription:
        'Ideal para espacios interiores donde la atmosfera y la seleccion de materiales ayudan a cerrar una venta. El servicio incluye encuadres pensados para mostrar sensacion espacial, detalles y puntos fuertes del ambiente.',
      includes: [
        'Set de camara principal y secundaria',
        'Ambientacion con mobiliario y decoracion',
        'Version vertical para redes'
      ],
      extraDetails: [
        { label: 'Base requerida', value: 'Planos o modelo AutoCAD del ambiente' },
        { label: 'Entrega', value: 'Imagen principal y adaptacion secundaria' },
        { label: 'Formato', value: 'Horizontal y vertical segun uso' },
        { label: 'Ajustes', value: '2 rondas incluidas' }
      ],
      accent: '#7d4bb5',
      surface: 'linear-gradient(135deg, rgba(125, 75, 181, 0.18), rgba(18, 12, 30, 0.08))',
      glow: 'radial-gradient(circle at 76% 22%, rgba(125, 75, 181, 0.34), transparent 44%)'
    },
    {
      id: 6,
      code: 'RND-URB-06',
      title: 'Vista Urbana / Masterplan',
      category: 'Renders AutoCAD',
      software: 'AutoCAD + postproduccion',
      priceFrom: 360,
      delivery: '4 a 5 dias',
      format: 'JPG 5K + panel de rotulos',
      support: '2 rondas de ajuste',
      idealFor: 'habilitaciones urbanas, condominios y lotizaciones',
      description:
        'Composicion panoramica para explicar escala, circulaciones y contexto general de un desarrollo urbano.',
      longDescription:
        'Se orienta a proyectos que necesitan una lectura global del conjunto, no solo una vista puntual. La pieza final ayuda a comunicar relaciones entre etapas, areas comunes, vialidad y contexto inmediato de manera mas clara para clientes o inversionistas.',
      includes: [
        'Jerarquia vial y paisajismo',
        'Rotulacion de zonas clave',
        'Entrega optimizada para presentacion'
      ],
      extraDetails: [
        { label: 'Base requerida', value: 'Planimetria general o esquema urbano' },
        { label: 'Entrega', value: 'Panel panoramico en alta resolucion' },
        { label: 'Uso ideal', value: 'Presentaciones, masterplan y ventas' },
        { label: 'Ajustes', value: '2 rondas de correccion' }
      ],
      accent: '#383f63',
      surface: 'linear-gradient(135deg, rgba(56, 63, 99, 0.18), rgba(14, 16, 26, 0.08))',
      glow: 'radial-gradient(circle at 80% 18%, rgba(56, 63, 99, 0.36), transparent 42%)'
    }
  ];

  readonly categories = ['Todos', ...new Set(this.products.map((product) => product.category))];
  selectedCategory = 'Todos';
  selectedProductId = this.products[0]?.id ?? 0;
  isDetailsExpanded = false;

  get visibleProducts(): StoreProduct[] {
    if (this.selectedCategory === 'Todos') {
      return this.products;
    }

    return this.products.filter((product) => product.category === this.selectedCategory);
  }

  get selectedProduct(): StoreProduct | null {
    const visible = this.visibleProducts;
    return visible.find((product) => product.id === this.selectedProductId) ?? visible[0] ?? null;
  }

  setCategory(category: string): void {
    if (this.selectedCategory === category) {
      return;
    }

    this.selectedCategory = category;
    const firstVisible = this.visibleProducts[0];
    if (!firstVisible) {
      this.selectedProductId = 0;
      return;
    }

    if (!this.visibleProducts.some((product) => product.id === this.selectedProductId)) {
      this.selectedProductId = firstVisible.id;
    }

    this.isDetailsExpanded = false;
  }

  selectProduct(productId: number): void {
    this.selectedProductId = productId;
    this.isDetailsExpanded = false;
  }

  isSelected(productId: number): boolean {
    return this.selectedProductId === productId;
  }

  formatPrice(amount: number): string {
    return this.currency.format(amount);
  }

  toggleDetails(): void {
    this.isDetailsExpanded = !this.isDetailsExpanded;
  }

  buildWhatsAppHref(product: StoreProduct): string {
    const message = encodeURIComponent(
      `Hola, quiero reservar el producto ${product.code} - ${product.title}. Vi el precio desde ${this.formatPrice(product.priceFrom)} y quiero seguir con la compra.`
    );

    return `https://wa.me/${this.whatsappNumber}?text=${message}`;
  }

  trackByProduct(index: number, product: StoreProduct): number {
    return product.id;
  }
}
