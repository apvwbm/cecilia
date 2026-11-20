// Tipos del dominio. Días como 'YYYY-MM-DD' en hora local (`lib/fechas.ts`); instantes en
// epoch ms.

import type { CATEGORIAS } from '@/theme';

export type Categoria = (typeof CATEGORIAS)[number]['id'];

/**
 * Cada palabra son dos tarjetas: en `pensar` se ve el inglés y se piensa el español; en
 * `escribir` se ve el español y se escribe el inglés. Reconocer y producir son cosas
 * distintas, así que cada una lleva su propia programación.
 */
export type Modo = 'pensar' | 'escribir';
export const MODOS: Modo[] = ['pensar', 'escribir'];

/** Lo que se puntúa ella misma al ver la respuesta: nada se corrige solo. */
export type Nota = 'ok' | 'regular' | 'ko';

export type Palabra = {
  id: string;
  ingles: string;
  espanol: string;
  /** "Su forma de decirlo", sin las barras: las pone la pantalla. Puede ir vacía. */
  pronunciacion: string;
  categoria: Categoria;
  creada: number;
};

/** La programación de una tarjeta. Si una tarjeta no tiene, es nueva. */
export type Repaso = {
  palabra: string;
  modo: Modo;
  /** Días hasta el siguiente repaso. 0 = acaba de fallarse y vuelve hoy. */
  intervalo: number;
  /** Multiplicador del intervalo en %: 250 = ×2,5. Baja con cada fallo. */
  facilidad: number;
  toca: string;
  ultimo: string;
};

export type Tarjeta = { palabra: string; modo: Modo };
