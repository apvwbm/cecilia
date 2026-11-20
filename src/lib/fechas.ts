// Fechas sin dependencias y sin `Intl`, para que el resultado sea el mismo en cualquier
// móvil y se pueda verificar en Node.
//
// Días como 'YYYY-MM-DD' en hora LOCAL, siempre. Nunca `toISOString()` ni
// `new Date('2026-01-05')`: los dos pasan por UTC y en España desplazan un día cerca de
// la medianoche.

const dos = (n: number) => String(n).padStart(2, '0');

export const aISO = (d: Date): string => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

export const hoyISO = (): string => aISO(new Date());

export const desdeISO = (iso: string): Date => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

/** `new Date(2026, 0, 32)` es el 1 de febrero: el propio Date resuelve los meses. */
export function addDias(iso: string, delta: number): string {
  const d = desdeISO(iso);
  return aISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

/** Días de `a` a `b`, con signo. Por `Date.UTC`: el día del cambio de hora mide 23 o 25 h. */
export function diasEntre(a: string, b: string): number {
  const [aa, am, ad] = a.split('-').map(Number);
  const [ba, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(ba, bm - 1, bd) - Date.UTC(aa, am - 1, ad)) / 86400000);
}

const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '3 Nov 2026'. En inglés, como toda la interfaz. */
export const fechaCorta = (iso: string): string => {
  const d = desdeISO(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};

/** El cronómetro: '3:54', y con horas '1:03:54'. */
export function duracion(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${dos(m)}:${dos(s % 60)}` : `${m}:${dos(s % 60)}`;
}
