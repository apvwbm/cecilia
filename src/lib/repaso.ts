// La lógica de repaso, estilo Anki. Funciones puras: `hoy` y el azar entran por
// parámetro para que `scripts/verifica.ts` pueda probarlo todo sin depender del día.
//
// Es SM-2 con tres botones (OK, más o menos, KO) y con una diferencia a propósito: el
// intervalo nuevo sale de los días que han pasado DE VERDAD desde el último repaso, no
// del intervalo guardado. En un repaso a su hora es lo mismo; en uno adelantado evita que
// acertar tres días seguidos mande la palabra a dos meses.
//
// Se puede repasar sin límite, así que la misma tarjeta puede salir varias veces el
// mismo día. Esas repeticiones son práctica, no un dato nuevo sobre la memoria: la
// facilidad cambia como mucho una vez al día y un acierto repetido no alarga el
// intervalo. Lo único que sí hacen es lo que importa: un fallo la devuelve a hoy.

import { addDias, diasEntre } from './fechas';
import { comparaTexto } from './texto';
import { MODOS, type Nota, type Palabra, type Repaso, type Tarjeta } from '@/types';

export const FACILIDAD_INICIAL = 250;
export const FACILIDAD_MINIMA = 130;
/** Cuántas tarjetas después vuelve una roja dentro de la misma sesión. */
export const REPETIR_EN = 4;

const BAJA_KO = 20;
const BAJA_REGULAR = 15;
/** El OK sube un poco: sin esto, una palabra que se falló una vez se quedaría hundida para siempre. */
const SUBE_OK = 5;
const CRECE_REGULAR = 1.2;

export const claveTarjeta = (t: Tarjeta) => `${t.palabra}:${t.modo}`;

const indexa = (repasos: Repaso[]): Record<string, Repaso> =>
  Object.fromEntries(repasos.map((r) => [claveTarjeta(r), r]));

const tarjetasDe = (palabras: Palabra[]): Tarjeta[] =>
  palabras.flatMap((p) => MODOS.map((modo) => ({ palabra: p.id, modo: modo })));

/**
 * La programación de una tarjeta tras puntuarla.
 * - KO: vuelve hoy (intervalo 0) y baja la facilidad.
 * - Más o menos: crece poco y baja la facilidad.
 * - OK: crece por la facilidad. Nunca acerca la fecha que ya tenía: acertar por
 *   adelantado no puede hacer que salga antes.
 * Nueva o recién fallada, cualquier acierto la deja para mañana.
 * Otra vez el mismo día: la facilidad no se toca y el OK conserva la fecha que tenía.
 */
export function programa(previo: Repaso | undefined, tarjeta: Tarjeta, nota: Nota, hoy: string): Repaso {
  const f = previo?.facilidad ?? FACILIDAD_INICIAL;
  const desdeCero = !previo || previo.intervalo === 0;
  const mismoDia = previo?.ultimo === hoy;
  const pasados = previo ? Math.max(1, diasEntre(previo.ultimo, hoy)) : 1;
  const ajusta = (delta: number) =>
    mismoDia ? f : Math.min(FACILIDAD_INICIAL, Math.max(FACILIDAD_MINIMA, f + delta));

  let facilidad: number;
  let intervalo: number;
  if (nota === 'ko') {
    facilidad = ajusta(-BAJA_KO);
    intervalo = 0;
  } else if (nota === 'regular') {
    facilidad = ajusta(-BAJA_REGULAR);
    intervalo = desdeCero ? 1 : Math.max(1, Math.round(pasados * CRECE_REGULAR));
  } else {
    facilidad = ajusta(SUBE_OK);
    if (desdeCero) intervalo = 1;
    else if (mismoDia) intervalo = Math.max(1, diasEntre(hoy, previo.toca));
    else intervalo = Math.max(pasados + 1, Math.round((pasados * f) / 100), diasEntre(hoy, previo.toca));
  }

  return {
    palabra: tarjeta.palabra,
    modo: tarjeta.modo,
    intervalo: intervalo,
    facilidad: facilidad,
    toca: addDias(hoy, intervalo),
    ultimo: hoy,
  };
}

/** Las tarjetas que tocan hoy (o antes) y las que no se han visto nunca, de los dos modos. */
export function pendientes(palabras: Palabra[], repasos: Repaso[], hoy: string): Tarjeta[] {
  const indice = indexa(repasos);
  return tarjetasDe(palabras).filter((t) => {
    const r = indice[claveTarjeta(t)];
    return !r || r.toca <= hoy;
  });
}

/** Fisher-Yates con el azar por parámetro. */
function baraja<T>(lista: T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Que las dos tarjetas de una palabra no salgan seguidas: "hello" para escribir y, al rato,
 * "hello" para pensar. Como cada palabra tiene dos tarjetas, si la de detrás repite basta con
 * cambiarla por la siguiente que no repita; y si es la última, se lleva al principio.
 */
export function separa(cola: Tarjeta[]): Tarjeta[] {
  const r = [...cola];
  for (let i = 1; i < r.length; i++) {
    if (r[i].palabra !== r[i - 1].palabra) continue;
    const j = r.findIndex((t, k) => k > i && t.palabra !== r[i - 1].palabra);
    if (j >= 0) [r[i], r[j]] = [r[j], r[i]];
    else if (r[0].palabra !== r[i].palabra) r.unshift(...r.splice(i, 1));
  }
  return r;
}

/**
 * Una sesión de `n` preguntas (las que elige ella al empezar), por prioridad, como Anki:
 *   0. Las que tocan, las más atrasadas primero.
 *   1. Las nuevas, en el orden en que se añadieron (la ordenación es estable).
 *   2. Las que aún no tocan, por la fecha en que tocarían: las rojas tienen el intervalo
 *      más corto, así que salen antes.
 *   3. Esas mismas, pero ya vistas hoy: van al final.
 * Así se puede repasar sin límite y cada ronda trae otras palabras; las de hoy solo vuelven
 * cuando no queda nada más. Las elegidas se barajan, con los dos modos mezclados.
 */
export function eligeSesion(
  palabras: Palabra[],
  repasos: Repaso[],
  hoy: string,
  n: number,
  azar: () => number = Math.random,
): Tarjeta[] {
  const indice = indexa(repasos);
  const candidatas = tarjetasDe(palabras).map((t) => ({ tarjeta: t, repaso: indice[claveTarjeta(t)] }));
  const prioridad = ({ repaso: r }: (typeof candidatas)[number]) =>
    !r ? 1 : r.toca <= hoy ? 0 : r.ultimo === hoy ? 3 : 2;

  const elegidas = candidatas
    .sort((a, b) => {
      const p = prioridad(a) - prioridad(b);
      if (p !== 0 || !a.repaso || !b.repaso) return p;
      return comparaTexto(a.repaso.toca, b.repaso.toca) || a.repaso.facilidad - b.repaso.facilidad;
    })
    .slice(0, n)
    .map((c) => c.tarjeta);
  return separa(baraja(elegidas, azar));
}

/** Avanza la cola: la tarjeta de delante sale y, si fue roja, vuelve `REPETIR_EN` más atrás. */
export function siguiente(cola: Tarjeta[], nota: Nota): Tarjeta[] {
  const [actual, ...resto] = cola;
  if (!actual || nota !== 'ko') return resto;
  const i = Math.min(REPETIR_EN, resto.length);
  return [...resto.slice(0, i), actual, ...resto.slice(i)];
}
