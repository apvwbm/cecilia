// Tokens de diseño. Los colores están sacados del PDF de May, píxel a píxel: ninguna
// pantalla escribe un color literal fuera de aquí.

import type { TextStyle } from 'react-native';

export const colores = {
  fondo: '#FFF4C5',
  hoja: '#FFFFFF',
  /** El inglés, los títulos y todo lo que es "de la app". */
  tinta: '#1800AD',
  /** El español, siempre en negrita cursiva. */
  rojo: '#961414',
  /** La pronunciación, y las reglas y puntos de la libreta. */
  azul: '#38B6FF',
  /** Las dos tarjetas de detrás del mazo. */
  mazo1: '#D9D9D9',
  mazo2: '#B4B4B4',
  blanco: '#FFFFFF',
  /** Los mismos tres, apagados: placeholders y texto secundario. */
  tintaSuave: 'rgba(24,0,173,0.38)',
  rojoSuave: 'rgba(150,20,20,0.32)',
  azulSuave: 'rgba(56,182,255,0.5)',
  blancoSuave: 'rgba(255,255,255,0.75)',
} as const;

/** Las tres caras: relleno y borde, como en el diseño. */
export const coloresNota = {
  ok: { fondo: '#90AC69', borde: '#3D7624' },
  regular: { fondo: '#DCC569', borde: '#C2A224' },
  ko: { fondo: '#C37460', borde: '#961414' },
} as const;

/**
 * Las cinco pestañas de la libreta, en el orden del diseño. El `id` es lo que se guarda
 * en la BD (con un CHECK contra esta misma lista en `esquema.ts`).
 */
export const CATEGORIAS = [
  { id: 'nouns', titulo: 'Nouns', color: '#F6C7E4' },
  { id: 'verbs', titulo: 'Verbs', color: '#C5F8E0' },
  { id: 'adjectives', titulo: 'Adjectives', color: '#C9BAE6' },
  { id: 'idioms', titulo: 'Idioms', color: '#E8B89A' },
  { id: 'adverbs', titulo: 'Adverbs', color: '#A4DEFF' },
] as const;

export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pantalla: 24 } as const;
export const radio = { sm: 10, md: 18, lg: 28, pill: 999 } as const;

// Canva Sans (la del diseño) es de Canva y no se puede meter en la app; Plus Jakarta Sans
// es la de Google Fonts que más se le parece, en redonda y en cursiva.
export const fuentes = {
  medio: 'PlusJakartaSans_500Medium',
  negrita: 'PlusJakartaSans_700Bold',
  cursiva: 'PlusJakartaSans_700Bold_Italic',
  gruesa: 'PlusJakartaSans_800ExtraBold',
} as const;

const preset = (s: TextStyle): TextStyle => s;

export const typo = {
  /** Botones grandes de la Home. */
  boton: preset({ fontFamily: fuentes.negrita, fontSize: 28, lineHeight: 34 }),
  /** El contador y el cronómetro del repaso. */
  cifra: preset({ fontFamily: fuentes.gruesa, fontSize: 34, lineHeight: 40 }),
  /** La palabra grande de una tarjeta. */
  palabra: preset({ fontFamily: fuentes.negrita, fontSize: 40, lineHeight: 48 }),
  traduccion: preset({ fontFamily: fuentes.cursiva, fontSize: 36, lineHeight: 44 }),
  pron: preset({ fontFamily: fuentes.negrita, fontSize: 24, lineHeight: 30 }),
  /** La píldora del título y los botones normales. */
  pildora: preset({ fontFamily: fuentes.negrita, fontSize: 16, lineHeight: 20 }),
  texto: preset({ fontFamily: fuentes.medio, fontSize: 16, lineHeight: 23 }),
  apoyo: preset({ fontFamily: fuentes.medio, fontSize: 14, lineHeight: 19 }),
} as const;

/** Lo de debajo del mazo, para no animar sombras (la `elevation` de Android no se lleva bien). */
export const DESPLAZAMIENTO_MAZO = 8;
