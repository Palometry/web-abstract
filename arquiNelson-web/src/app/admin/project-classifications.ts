export type ProjectCatalog = {
  scopes: string[];
  edificaciones: Record<string, Record<string, string[]>>;
  habilitaciones: Record<string, string[]>;
};

export const PUBLIC_SCOPE_OPTIONS = ['Edificaciones', 'Habilitaciones'] as const;

export const EDIFICACIONES_DATA: Record<string, Record<string, string[]>> = {
  'A.020 VIVIENDA': {
    'Edificación para grupos familiares': [
      'Vivienda Unifamiliar',
      'Vivienda bifamiliar',
      'Quinta',
      'Vivienda taller',
      'Vivienda multifamiliar',
      'Conjunto habitacional / residencial'
    ],
    'Edificación para grupos de individuos': ['Vivienda de uso colectivo']
  },
  'A.030 HOSPEDAJE': {
    Hotel: ['Uno a cinco estrellas'],
    'Apart-hotel': ['Tres a cinco estrellas'],
    Hostal: ['Una a tres estrellas'],
    Albergue: []
  },
  'A.040 EDUCACIÓN': {
    'Educación Básica': [
      'Educación Basica Regular (EBR)',
      'Educación Basica Alternativa (EBA)',
      'Educación Basica Especial (EBE)'
    ],
    'Educación Superior': [
      'Universidades',
      'Institutos de Educación Superior',
      'Escuelas de Educación Superior',
      'Escuelas de postgrados'
    ],
    'Otras formas de atención educativa': [
      'Institutos o centros de Idiomas',
      'Centro de Educación Técnico Productiva (CETPRO)',
      'Centros de Educación Comunitaria',
      'Centros preuniversitarios',
      'Otros de naturaleza semejante donde se desarrollen actividades de capacitación y educación'
    ]
  },
  'A.050 SALUD': {
    Hospitales: [
      'Hospital Tipo I',
      'Hospital Tipo II',
      'Hospital Tipo III',
      'Hospital Tipo IV',
      'Hospital Pequeño. Hasta 49 camas',
      'Hospital Mediano, de 50 hasta 149 camas',
      'Hospital Grande, de 150 hasta 399 camas',
      'Hospital Extra Grande, 400 camas a más',
      'Hospital: Nacional',
      'Hospital de Apoyo Departamental',
      'Hospital de Apoyo Local'
    ],
    'Centro de Salud': [
      'Tipo I: Sin Unidad de Internamiento y con Unidad de Ayuda al Diagnóstico.',
      'Tipo II: Con Unidad de Internamiento, Centro Obstétrico y Quirúrgico, con énfasis en la atención madre - niño'
    ],
    'Puestos de Salud': ['Unidad de atención', 'Unidad de vivienda']
  },
  'A.070 COMERCIO': {
    'Tienda independiente': [
      'Locales de expendio de comidas y bebidas - Restaurante',
      'Cafetería',
      'Local de comida rápida',
      'Local de venta de comida al paso',
      'Local de expendio de combustibles y/o de energía eléctrica - Establecimiento de venta de combustibles (Estación de servicio, grifo, gasocentro) y/o de energía eléctrica para vehículos.'
    ],
    'Locales comerciales agrupados': [
      'Mercado de abastos - Mercado de abastos mayorista',
      'Mercado de abastos minorista'
    ],
    'Tienda por departamentos': [
      'Tienda de autoservicio - Supermercado',
      'Tienda de mejoramiento del hogar',
      'Otras tiendas de autoservicio',
      'Local de servicios para vehículos - Local de estacionamiento de vehículos',
      'Local de venta, mantenimiento y/o limpieza de vehículos'
    ],
    'Locales Bancarios y de intermediación financiera': [
      'Locales de entretenimiento y/o recreo - Parques de diversión y/o recreo, salas de juegos (electrónicos, video, bowling, de mesa, entre otros)',
      'Locales de servicios personales - Spa, baño turco, sauna, baño de vapor, barbería y/o salón de belleza.',
      'Gimnasio, fisicoculturismo'
    ]
  },
  'A.100 RECREACIÓN Y DEPORTES': {
    'Salas de Espectáculos': ['Teatros', 'Cines', 'Salas de concierto'],
    'Centros de Diversión': ['Salones de baile', 'Discotecas', 'Pubs', 'Casinos'],
    'Edificaciones para Espectáculos Deportivos': [
      'Estadios',
      'Coliseos',
      'Hipódromos',
      'Velódromos',
      'Polideportivos',
      'Instalaciones Deportivas al aire libre.'
    ]
  },
  'A0.90 SERVICIOS COMUNALES': {
    'Servicios Culturales': ['Museos', 'Galerías de arte', 'Bibliotecas', 'Salones Comunales'],
    Gobierno: ['Municipalidades', 'Locales Institucionales'],
    'Protección social': ['Asilos', 'Orfanatos', 'Juzgados'],
    'Servicios de Seguridad y Vigilancia': [
      'Compañias de bomberos',
      'Comisarias policiales',
      'Estaciones para Serenazgo'
    ],
    'Servicios de Culto': ['Templos', 'Cementerios']
  }
};

export const HABILITACIONES_DATA: Record<string, string[]> = {
  'HABILITACIONES RESIDENCIALES': [
    'Habilitaciones para uso de vivienda o Urbanizaciones',
    'Habilitaciones para uso de Vivienda Taller',
    'Habilitaciones para uso de Vivienda Tipo Club',
    'Habilitación y construcción urbana especial'
  ],
  'HABILITACIONES COMERCIALES': [
    'Habilitaciones para uso de Comercio Exclusivo',
    'Habilitaciones para uso de Comercio y otros usos. (Uso Mixto)'
  ],
  'HABILITACIONES PARA USO INDUSTRIAL': [
    'Elemental y complementaria',
    'Liviana',
    'Gran Industria',
    'Industria Pesada Basica'
  ],
  'HABILITACIONES PARA USOS ESPECIALES': [
    'Locales educativos, religiosos, de salud, institucionales, deportivos, recreacionales y campos feriales.'
  ]
};

export const DEFAULT_PROJECT_CATALOG: ProjectCatalog = {
  scopes: [...PUBLIC_SCOPE_OPTIONS],
  edificaciones: EDIFICACIONES_DATA,
  habilitaciones: HABILITACIONES_DATA
};
