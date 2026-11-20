// Verificación de la lógica pura: `npm run verifica`.
//
// Asserts a mano, sin framework (como en Catffeine y Etxea). La migración se prueba con
// el `node:sqlite` de Node. Lo nativo (SQLCipher, las copias) solo se prueba en el móvil.

// El cambio de hora de España, pase lo que pase en la máquina que lo ejecute.
process.env.TZ = 'Europe/Madrid';

import { DatabaseSync } from 'node:sqlite';

import { MIGRACIONES, migrar, VERSION_ESQUEMA } from '../src/lib/esquema';
import { addDias, diasEntre, duracion, fechaCorta } from '../src/lib/fechas';
import {
  eligeSesion,
  FACILIDAD_INICIAL,
  FACILIDAD_MINIMA,
  pendientes,
  programa,
  REPETIR_EN,
  separa,
  siguiente,
} from '../src/lib/repaso';
import { limpiaPron, normaliza } from '../src/lib/texto';
import type { Palabra, Repaso, Tarjeta } from '../src/types';

let fallos = 0;
let total = 0;
const igual = (nombre: string, real: unknown, esperado: unknown) => {
  total++;
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos++;
    console.log(`  ✗ ${nombre}\n      esperado ${b}\n      real     ${a}`);
  }
};
const ok = (nombre: string, cond: boolean) => igual(nombre, cond, true);
const bloque = (nombre: string) => console.log(`── ${nombre} ──`);

// ── Fábricas ─────────────────────────────────────────────────────────────────

const palabra = (id: string): Palabra => ({
  id: id,
  ingles: id,
  espanol: `es-${id}`,
  pronunciacion: '',
  categoria: 'nouns',
  creada: 0,
});
const repaso = (palabra: string, modo: Repaso['modo'], cambios: Partial<Repaso> = {}): Repaso => ({
  palabra: palabra,
  modo: modo,
  intervalo: 3,
  facilidad: 250,
  toca: '2026-11-20',
  ultimo: '2026-11-17',
  ...cambios,
});
/** Azar fijo y repetible, para que las pruebas de barajar no dependan de la suerte. */
const semilla = (n: number) => () => {
  n = (n * 16807) % 2147483647;
  return (n - 1) / 2147483646;
};
const seguidas = (cola: Tarjeta[]) => cola.some((t, i) => i > 0 && t.palabra === cola[i - 1].palabra);
const HOY = '2026-11-20';
const T = { palabra: 'a', modo: 'pensar' } as const;

// ── Fechas ───────────────────────────────────────────────────────────────────

bloque('fechas');
igual('addDias cruza mes', addDias('2026-01-31', 1), '2026-02-01');
igual('diasEntre en el cambio de hora de marzo', diasEntre('2026-03-28', '2026-03-30'), 2);
igual('diasEntre en el de octubre', diasEntre('2026-10-24', '2026-10-26'), 2);
igual('fechaCorta', fechaCorta('2026-11-03'), '3 Nov 2026');
igual('duracion minutos', duracion(234_000), '3:54');
igual('duracion horas', duracion(3_834_000), '1:03:54');

// ── Texto ────────────────────────────────────────────────────────────────────

bloque('texto');
igual('normaliza', normaliza('  Árbol   Grande '), 'arbol grande');
igual('limpiaPron quita barras', limpiaPron(' /jelou/ '), 'jelou');
igual('limpiaPron sin barras', limpiaPron('jelou'), 'jelou');

// ── programa() ───────────────────────────────────────────────────────────────

bloque('programa');
{
  const nuevaOk = programa(undefined, T, 'ok', HOY);
  igual('nueva + OK: mañana', [nuevaOk.intervalo, nuevaOk.toca, nuevaOk.ultimo], [1, '2026-11-21', HOY]);
  igual('nueva + OK: facilidad inicial', nuevaOk.facilidad, FACILIDAD_INICIAL);
  igual('nueva + regular: mañana', programa(undefined, T, 'regular', HOY).intervalo, 1);
  const nuevaKo = programa(undefined, T, 'ko', HOY);
  igual('nueva + KO: hoy', [nuevaKo.intervalo, nuevaKo.toca], [0, HOY]);
  igual('KO baja 20', nuevaKo.facilidad, 230);

  // OK seguidos y a su hora: 1, 3, 8, 20, 50.
  let r: Repaso | undefined;
  let dia = HOY;
  const intervalos: number[] = [];
  for (let i = 0; i < 5; i++) {
    r = programa(r, T, 'ok', dia);
    intervalos.push(r.intervalo);
    dia = r.toca;
  }
  igual('OK seguidos a su hora', intervalos, [1, 3, 8, 20, 50]);

  // Tras KO, cualquier acierto vuelve a empezar por mañana.
  const fallada = programa(repaso('a', 'pensar', { intervalo: 20, ultimo: '2026-10-31' }), T, 'ko', HOY);
  igual('KO de una madura: hoy', fallada.intervalo, 0);
  igual('OK tras KO en la misma sesión: mañana', programa(fallada, T, 'ok', HOY).intervalo, 1);
  igual('regular tras KO: mañana', programa(fallada, T, 'regular', HOY).intervalo, 1);

  // El mismo día: repetirla es práctica, no un dato nuevo sobre la memoria.
  const otraVez = programa(programa(undefined, T, 'ok', HOY), T, 'ok', HOY);
  igual('nueva, OK dos veces el mismo día: sigue mañana', [otraVez.intervalo, otraVez.toca], [1, '2026-11-21']);
  const madura = repaso('a', 'pensar', { intervalo: 20, ultimo: '2026-10-31', toca: HOY });
  const bien = programa(madura, T, 'ok', HOY);
  const repetida = programa(bien, T, 'ok', HOY);
  igual('OK repetido el mismo día no alarga', [repetida.toca, repetida.facilidad], [bien.toca, bien.facilidad]);
  const ko1 = programa(madura, T, 'ko', HOY);
  const ko2 = programa(ko1, T, 'ko', HOY);
  igual('dos KO el mismo día bajan la facilidad una vez', [ko1.facilidad, ko2.facilidad], [230, 230]);
  const trasKo = programa(ko2, T, 'ok', HOY);
  igual('OK tras KO el mismo día: mañana, sin subir facilidad', [trasKo.intervalo, trasKo.facilidad], [1, 230]);

  // Regular: crece poco y baja la facilidad.
  const reg = programa(repaso('a', 'pensar', { intervalo: 10, ultimo: '2026-11-10' }), T, 'regular', HOY);
  igual('regular: ×1,2 de lo pasado', [reg.intervalo, reg.facilidad], [12, 235]);

  // Topes de facilidad.
  igual('facilidad no baja de 130', programa(repaso('a', 'pensar', { facilidad: 135 }), T, 'ko', HOY).facilidad, FACILIDAD_MINIMA);
  igual('facilidad no pasa de 250', programa(repaso('a', 'pensar', { facilidad: 248 }), T, 'ok', HOY).facilidad, 250);
  igual('OK recupera facilidad', programa(repaso('a', 'pensar', { facilidad: 200 }), T, 'ok', HOY).facilidad, 205);

  // Por adelantado: acertar nunca acerca la fecha que ya tenía.
  const adelantada = repaso('a', 'pensar', { intervalo: 20, ultimo: '2026-11-19', toca: '2026-12-09' });
  const tras = programa(adelantada, T, 'ok', HOY);
  ok('OK adelantado no acerca la fecha', tras.toca >= adelantada.toca);
  igual('OK adelantado mantiene la fecha', tras.toca, '2026-12-09');
  // Atrasada: cuenta lo que ha pasado de verdad.
  const atrasada = programa(repaso('a', 'pensar', { intervalo: 3, ultimo: '2026-11-10', toca: '2026-11-13' }), T, 'ok', HOY);
  igual('OK atrasado: días reales × facilidad', atrasada.intervalo, 25);
}

// ── Sesión ───────────────────────────────────────────────────────────────────

bloque('sesión');
{
  const palabras = ['a', 'b', 'c', 'd'].map(palabra);
  const repasos = [
    repaso('a', 'pensar', { toca: '2026-11-19' }), // atrasada
    repaso('a', 'escribir', { toca: HOY }), // toca hoy
    repaso('b', 'pensar', { toca: '2026-11-21' }), // mañana: fuera
    repaso('b', 'escribir', { toca: '2026-12-01' }), // fuera
    // c y d: nuevas en los dos modos
  ];
  const p = pendientes(palabras, repasos, HOY);
  igual('pendientes: atrasadas, de hoy y nuevas', p.map((t) => `${t.palabra}:${t.modo}`), [
    'a:pensar',
    'a:escribir',
    'c:pensar',
    'c:escribir',
    'd:pensar',
    'd:escribir',
  ]);

  for (let s = 1; s <= 50; s++) {
    const sesion = eligeSesion(palabras, repasos, HOY, 99, semilla(s));
    if (sesion.length !== 8 || seguidas(sesion)) {
      igual(`eligeSesion semilla ${s}`, sesion, 'las ocho tarjetas sin dos de la misma palabra seguidas');
      break;
    }
  }
  ok('eligeSesion nunca pone seguidas dos de la misma palabra', true);
  igual('separa: la última repetida va al principio', separa([
    { palabra: 'a', modo: 'pensar' },
    { palabra: 'b', modo: 'pensar' },
    { palabra: 'b', modo: 'escribir' },
  ]).map((t) => t.palabra), ['b', 'a', 'b']);
  igual('separa: una sola palabra no tiene arreglo', separa([
    { palabra: 'a', modo: 'pensar' },
    { palabra: 'a', modo: 'escribir' },
  ]).length, 2);
  igual('sin palabras, sesión vacía', eligeSesion([], [], HOY, 20), []);
}

bloque('eligeSesion: prioridad');
{
  const palabras = ['a', 'b', 'c', 'd', 'e'].map(palabra);
  const repasos = [
    repaso('a', 'pensar', { toca: HOY }), // toca hoy
    repaso('a', 'escribir', { toca: '2026-11-15' }), // la más atrasada
    repaso('b', 'pensar', { toca: '2026-11-30', facilidad: 250 }), // aún no toca
    repaso('b', 'escribir', { toca: '2026-11-22', facilidad: 150 }), // roja: toca antes
    repaso('c', 'pensar', { toca: '2026-11-21', ultimo: HOY }), // vista hoy: al final
    repaso('c', 'escribir', { toca: '2026-11-21', ultimo: HOY }),
    repaso('zz', 'pensar', { toca: '2026-11-01' }), // de una palabra borrada: no sale
    // d y e: nuevas
  ];
  const elige = (n: number) => eligeSesion(palabras, repasos, HOY, n, semilla(3)).map((t) => `${t.palabra}:${t.modo}`).sort();
  igual('1: la más atrasada', elige(1), ['a:escribir']);
  igual('2: las que tocan', elige(2), ['a:escribir', 'a:pensar']);
  igual('6: después las nuevas', elige(6), ['a:escribir', 'a:pensar', 'd:escribir', 'd:pensar', 'e:escribir', 'e:pensar']);
  igual('7: luego la que tocaría antes (la roja)', elige(7).filter((c) => c.startsWith('b')), ['b:escribir']);
  igual('8: las que no ha visto hoy antes que las de hoy', elige(8).filter((c) => c.startsWith('c')), []);
  igual('sin límite: todas, sin las de palabras borradas', elige(99).length, 10);
  igual('una ronda nunca repite tarjeta', new Set(elige(99)).size, 10);
}

bloque('siguiente');
{
  const cola: Tarjeta[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((p) => ({ palabra: p, modo: 'pensar' }));
  igual('OK: sale la primera', siguiente(cola, 'ok').map((t) => t.palabra).join(''), 'bcdef');
  igual('regular: sale la primera', siguiente(cola, 'regular').length, 5);
  const trasKo = siguiente(cola, 'ko');
  igual('KO: vuelve más atrás', trasKo.map((t) => t.palabra).join(''), 'bcdeaf');
  igual('KO: la cola no se acorta (no cuenta como hecha)', trasKo.length, 6);
  igual('KO: vuelve a REPETIR_EN', trasKo.findIndex((t) => t.palabra === 'a'), REPETIR_EN);
  igual('KO con poca cola: al final', siguiente(cola.slice(0, 2), 'ko').map((t) => t.palabra).join(''), 'ba');
  igual('KO de la última: se repite', siguiente(cola.slice(0, 1), 'ko').length, 1);
  igual('cola vacía', siguiente([], 'ok'), []);
}

// ── Migraciones ──────────────────────────────────────────────────────────────

bloque('migraciones');
{
  const db = new DatabaseSync(':memory:');
  const version = migrar((sql) => db.exec(sql), 0);
  igual('versión', version, VERSION_ESQUEMA);
  igual('user_version', (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, MIGRACIONES.length);
  igual('repetir es un no-op', migrar((sql) => db.exec(sql), version), version);

  const inserta = (cat: string, ingles = 'hello') =>
    db.prepare('INSERT INTO palabras (id, ingles, espanol, categoria, creada) VALUES (?, ?, ?, ?, ?)').run(
      `${cat}-${ingles}`,
      ingles,
      'hola',
      cat,
      1,
    );
  const falla = (f: () => unknown) => {
    try {
      f();
      return false;
    } catch {
      return true;
    }
  };
  inserta('nouns');
  igual('pronunciación por defecto', (db.prepare('SELECT pronunciacion FROM palabras').get() as { pronunciacion: string }).pronunciacion, '');
  ok('CHECK de categoría', falla(() => inserta('phrasal')));
  ok('CHECK de palabra vacía', falla(() => inserta('verbs', '   ')));
  ok('CHECK de modo', falla(() => db.prepare("INSERT INTO repasos VALUES ('x', 'leer', 1, 250, '2026-11-20', '2026-11-19')").run()));
  ok('una fila por palabra y modo', falla(() => {
    db.prepare("INSERT INTO repasos VALUES ('x', 'pensar', 1, 250, '2026-11-20', '2026-11-19')").run();
    db.prepare("INSERT INTO repasos VALUES ('x', 'pensar', 2, 250, '2026-11-21', '2026-11-19')").run();
  }));
  ok('versión futura se rechaza', falla(() => migrar((sql) => db.exec(sql), VERSION_ESQUEMA + 1)));
}

console.log(fallos === 0 ? `\n✔ ${total} comprobaciones` : `\n✖ ${fallos} de ${total} fallan`);
process.exit(fallos === 0 ? 0 : 1);
