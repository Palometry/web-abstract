export type ProjectCatalog = {
  scopes: string[];
  edificaciones: Record<string, Record<string, string[]>>;
  habilitaciones: Record<string, string[]>;
};

export const PUBLIC_SCOPE_OPTIONS = ['Edificaciones', 'Habilitaciones'] as const;

export const EDIFICACIONES_DATA: Record<string, Record<string, string[]>> = {
  'VIVIENDA': {
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
  'HOSPEDAJE': {
    Hotel: ['Uno a cinco estrellas'],
    'Apart-hotel': ['Tres a cinco estrellas'],
    Hostal: ['Una a tres estrellas'],
    Albergue: []
  },
  'EDUCACIÓN': {
    'Educación Básica': [
      'Educación Básica Regular (EBR)',
      'Educación Básica Alternativa (EBA)',
      'Educación Básica Especial (EBE)'
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
  'SALUD': {
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
  'COMERCIO': {
    'Tienda independiente': [
      'Locales de expendio de comidas y bebidas',
      'Local de expendio de combustibles y/o de energía'
    ],
    'Locales Bancarios y de intermediación financiera': [
      'Locales de entretenimiento y/o recreo',
      'Locales de servicios personales'
    ],
    'Tienda por departamentos': [
      'Tienda de autoservicio',
      'Local de servicios para vehículos'
    ],
    'Locales comerciales agrupados': [
      'Mercado de abastos',
      'Galería Comercial',
      'Centro comercial',
      'Galería ferial'
    ]
  },
  'SERVICIOS COMUNALES': {
    'Servicios de Seguridad y Vigilancia': [
      'Compañías de bomberos',
      'Comisarías policiales',
      'Estaciones para Serenazgo'
    ],
    'Protección social': ['Asilos', 'Orfanatos', 'Juzgados'],
    'Servicios de Culto': ['Templos', 'Cementerios'],
    'Servicios Culturales': ['Museos', 'Galerías de arte', 'Bibliotecas', 'Salones Comunales'],
    Gobierno: ['Municipalidades', 'Locales Institucionales']
  },
  'RECREACIÓN Y DEPORTES': {
    'Centros de Diversión': ['Salones de baile', 'Discotecas', 'Pubs', 'Casinos'],
    'Salas de Espectáculos': ['Teatros', 'Cines', 'Salas de concierto'],
    'Edificaciones para Espectáculos Deportivos': [
      'Estadios',
      'Coliseos',
      'Hipódromos',
      'Velódromos',
      'Polideportivos',
      'Instalaciones Deportivas al aire libre'
    ]
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
    'Habilitaciones para uso de Comercio y otros usos (Uso Mixto)'
  ],
  'HABILITACIONES PARA USO INDUSTRIAL': [
    'Elemental y complementaria',
    'Liviana',
    'Gran Industria',
    'Industria Pesada Básica'
  ],
  'HABILITACIONES PARA USOS ESPECIALES': [
    'Locales educativos, religiosos, de salud, institucionales, deportivos, recreacionales y campos feriales'
  ]
};

export const DEFAULT_PROJECT_CATALOG: ProjectCatalog = {
  scopes: [...PUBLIC_SCOPE_OPTIONS],
  edificaciones: EDIFICACIONES_DATA,
  habilitaciones: HABILITACIONES_DATA
};

const COMPACT_PROJECT_LABELS: Record<string, string> = {
  'Locales Bancarios y de intermediación financiera': 'Locales bancarios e intermediación financiera',
  'Locales de entretenimiento y/o recreo': 'Entretenimiento y recreo',
  'Locales de servicios personales': 'Servicios personales',
  'Locales de expendio de comidas y bebidas': 'Comidas y bebidas',
  'Local de expendio de combustibles y/o de energía': 'Combustibles y energía',
  'Educación Básica Regular (EBR)': 'Educación básica regular',
  'Educación Básica Alternativa (EBA)': 'Educación básica alternativa',
  'Educación Básica Especial (EBE)': 'Educación básica especial',
  'Institutos de Educación Superior': 'Institutos superiores',
  'Escuelas de Educación Superior': 'Escuelas superiores',
  'Escuelas de postgrados': 'Escuelas de postgrado',
  'Otros de naturaleza semejante donde se desarrollen actividades de capacitación y educación':
    'Otros centros de capacitación y educación',
  'Habilitaciones para uso de Comercio y otros usos (Uso Mixto)':
    'Comercio y otros usos',
  'Locales educativos, religiosos, de salud, institucionales, deportivos, recreacionales y campos feriales':
    'Locales para usos especiales'
};

function fixProjectEncoding(label: string): string {
  return label
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Â/g, '');
}

export function stripProjectTypeCode(label: string): string {
  return fixProjectEncoding(label).replace(/^[A-Z0-9]+\.\d+\s+/i, '').trim();
}

export function formatProjectTypeLabel(label: string): string {
  return stripProjectTypeCode(label);
}

export function formatProjectLabel(label: string): string {
  return fixProjectEncoding(label).trim();
}

function compactProjectText(label: string): string {
  const formatted = formatProjectLabel(label);
  const alias = COMPACT_PROJECT_LABELS[formatted];
  if (alias) {
    return alias;
  }

  const trimmedAtDash = formatted.includes(' - ')
    ? formatted.split(/\s+-\s+/, 1)[0]?.trim() || formatted
    : formatted;

  const compacted = trimmedAtDash
    .replace(/\sy\/o\s/gi, ' / ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return compacted.length > 72 ? `${compacted.slice(0, 69).trimEnd()}...` : compacted;
}

export function formatCompactProjectTypeLabel(label: string): string {
  return compactProjectText(stripProjectTypeCode(label));
}

export function formatCompactProjectLabel(label: string): string {
  return compactProjectText(label);
}

export function isHospedajeType(label: string): boolean {
  return stripProjectTypeCode(label).toUpperCase() === 'HOSPEDAJE';
}
