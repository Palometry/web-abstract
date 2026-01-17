import { Injectable } from '@angular/core';

export interface ProjectData {
  id: string;
  title: string;
  shortDesc: string;
  image: string;
  thumbImage: string;
  masterplanImage?: string;
  houseModels?: { name: string; description: string; image: string }[];
  housePlans?: { name: string; ambientes: number; totalArea: string; coveredArea: string; image: string }[];
  autocad360Url?: string;
  mapUrl?: string;
  mapEmbedUrl?: string;
  enjoyAreas?: string[];
  location: string;
  promoter: string;
  status: string;
  type: string;
  landArea: string;
  units: number;
  amenities: string[];
  startYear: number;
  deliveryYear: number;
  description: string;
  gallery: string[];
  lots?: { id: string; area: string; status: 'Disponible' | 'Reservado' | 'Vendido' }[];
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private projects: ProjectData[] = [
    {
      id: 'fundo-bellaca',
      title: 'FUNDO BELLACA',
      shortDesc: 'Lotes urbanizados con áreas verdes y accesos amplios',
      image: 'img/1_4 - Photo.jpg',
      thumbImage: 'img/1_4 - Photo.jpg',
      masterplanImage: 'img/1_4 - Photo.jpg',
      location: 'Bellaca, Moyobamba, Perú',
      promoter: 'Fun Bellata S.A.',
      status: 'En venta',
      type: 'Loteo Residencial',
      landArea: '12,000 m²',
      units: 28,
      amenities: ['Áreas verdes', 'Vías afirmadas', 'Iluminación perimetral', 'Zonas recreativas'],
      startYear: 2024,
      deliveryYear: 2026,
      description:
        'Fundo Bellaca ofrece lotes independientes con amplias áreas verdes, vías de acceso y un trazado pensado para la tranquilidad y plusvalía de la zona.',
      gallery: ['img/1_3 - Photo.jpg', 'img/1_5 - Photo.jpg', 'img/1_6 - Photo.jpg', 'img/1_7 - Photo.jpg'],
      houseModels: [
        {
          name: 'Modelo Aura',
          description: 'Distribucion eficiente para familias con patios amplios.',
          image: 'img/1_3 - Photo.jpg',
        },
        {
          name: 'Modelo Brisa',
          description: 'Espacios integrados y ventilacion cruzada para mayor confort.',
          image: 'img/1_5 - Photo.jpg',
        },
        {
          name: 'Modelo Rio',
          description: 'Propuesta flexible para ampliaciones y crecimiento familiar.',
          image: 'img/1_6 - Photo.jpg',
        },
      ],
      housePlans: [
        {
          name: 'Tipo 1',
          ambientes: 1,
          totalArea: '26.25 m2 aprox.',
          coveredArea: '20.10 m2 aprox.',
          image: 'img/1_3 - Photo.jpg',
        },
        {
          name: 'Tipo 2',
          ambientes: 1,
          totalArea: '35.46 m2 aprox.',
          coveredArea: '29.20 m2 aprox.',
          image: 'img/1_5 - Photo.jpg',
        },
        {
          name: 'Tipo 3',
          ambientes: 2,
          totalArea: '51.91 m2 aprox.',
          coveredArea: '40.30 m2 aprox.',
          image: 'img/1_6 - Photo.jpg',
        },
        {
          name: 'Tipo 4',
          ambientes: 3,
          totalArea: '68.10 m2 aprox.',
          coveredArea: '55.80 m2 aprox.',
          image: 'img/1_7 - Photo.jpg',
        },
      ],
      enjoyAreas: [
        'Estacionamiento',
        'Paseos naturales',
        'Zona de juegos para ninos',
        'Areas verdes',
        'Parque recreativo',
        'Senderos peatonales',
        'Area de parrillas',
        'Zona de picnic',
        'Estacionamiento para bicicletas',
      ],
      autocad360Url: 'https://a360.co/2PyLL5K',
      mapUrl: 'https://maps.app.goo.gl/2u33DR4zwRzA6ycV6',
      mapEmbedUrl: 'https://www.google.com/maps?q=-6.0444722,-77.0169444&z=17&output=embed',
    },
    {
      id: 'parque-empresarial-norte',
      title: 'Parque Empresarial Norte',
      shortDesc: 'Complejo corporativo de próxima construcción',
      image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&h=800&fit=crop',
      thumbImage: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=600&h=400&fit=crop',
      location: 'Tarapoto, Perú',
      promoter: 'Fun Bellata S.A.',
      status: 'En planificación',
      type: 'Parque Empresarial',
      landArea: '25,000 m²',
      units: 8,
      amenities: ['Oficinas premium', 'Locales comerciales', 'Auditorio', 'Áreas verdes'],
      startYear: 2025,
      deliveryYear: 2028,
      description:
        'Un parque empresarial moderno con espacios flexibles para oficinas, comercio y servicios, diseñado para atraer inversión y potenciar la actividad corporativa regional.',
      gallery: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
      ],
    },
    {
      id: 'residencial-los-cedros',
      title: 'Residencial Los Cedros',
      shortDesc: 'Torres residenciales sustentables en etapa de diseño',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&h=800&fit=crop',
      thumbImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop',
      location: 'Moyobamba, Perú',
      promoter: 'Fun Bellata S.A.',
      status: 'En diseño',
      type: 'Residencial Vertical',
      landArea: '8,500 m²',
      units: 160,
      amenities: ['Sky lounge', 'Gimnasio', 'Zona infantil', 'Co-working'],
      startYear: 2025,
      deliveryYear: 2029,
      description:
        'Conjunto de torres residenciales con enfoque ecológico, eficiencia energética y áreas comunes pensadas para la vida en comunidad.',
      gallery: [
        'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&h=800&fit=crop',
      ],
    },
    {
      id: 'loteo-valle-verde',
      title: 'Loteo Valle Verde',
      shortDesc: 'Nueva etapa de lotización con vistas panorámicas',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
      thumbImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop',
      masterplanImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
      location: 'Tarapoto, Perú',
      promoter: 'Fun Bellata S.A.',
      status: 'Próxima venta',
      type: 'Loteo Residencial',
      landArea: '15,000 m²',
      units: 32,
      amenities: ['Áreas verdes', 'Ciclovía', 'Miradores'],
      startYear: 2026,
      deliveryYear: 2028,
      description:
        'Lotes residenciales con vistas al valle, infraestructura básica y espacios destinados a recreación y movilidad sostenible.',
      gallery: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
      ],
      lots: [
        { id: 'Lote A1', area: '200 m²', status: 'Disponible' },
        { id: 'Lote A2', area: '200 m²', status: 'Disponible' },
        { id: 'Lote A3', area: '210 m²', status: 'Disponible' },
        { id: 'Lote A4', area: '210 m²', status: 'Disponible' },
        { id: 'Lote B1', area: '220 m²', status: 'Disponible' },
        { id: 'Lote B2', area: '220 m²', status: 'Disponible' },
        { id: 'Lote B3', area: '230 m²', status: 'Disponible' },
        { id: 'Lote B4', area: '230 m²', status: 'Disponible' },
        { id: 'Lote C1', area: '240 m²', status: 'Disponible' },
        { id: 'Lote C2', area: '240 m²', status: 'Disponible' },
        { id: 'Lote C3', area: '250 m²', status: 'Disponible' },
        { id: 'Lote C4', area: '250 m²', status: 'Disponible' },
      ],
    },
  ];

  getProjects(): ProjectData[] {
    return this.projects;
  }

  getProjectById(id: string): ProjectData | undefined {
    return this.projects.find((p) => p.id === id);
  }
}
