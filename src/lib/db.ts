// Base de datos local cifrada: expo-sqlite compilado con SQLCipher (ver el plugin en
// app.json). Es la de Catffeine con otras tablas.
//
// La clave son 32 bytes aleatorios generados en el primer arranque y guardados en
// SecureStore (Android Keystore). Se pasa como clave en bruto (`x'…'`), lo que evita la
// derivación PBKDF2 en cada arranque: abrir es instantáneo.
//
// En Expo Go no hay SQLCipher: `PRAGMA key` se ignora y la base queda SIN cifrar.
// `estaCifrada()` lo dice, y las copias se niegan a funcionar ahí.
//
// Todo es síncrono a propósito: con los datos de una persona, cada consulta tarda
// microsegundos y así el store escribe y pinta en el mismo tick.

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { migrar } from './esquema';
import type { Palabra, Repaso } from '@/types';

const NOMBRE = 'cecilia.db';
const CLAVE_SECURE_STORE = 'cecilia.clave';

let db: SQLite.SQLiteDatabase;
let cifrada = false;

/** false en Expo Go, que no trae SQLCipher. */
export const estaCifrada = () => cifrada;

export const conexion = () => db;

async function claveCifrado(): Promise<string> {
  const guardada = await SecureStore.getItemAsync(CLAVE_SECURE_STORE);
  if (guardada) return guardada;
  const nueva = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(CLAVE_SECURE_STORE, nueva);
  return nueva;
}

export const versionDe = (base: SQLite.SQLiteDatabase): number =>
  base.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;

export async function abrir(): Promise<void> {
  const clave = await claveCifrado();
  db = SQLite.openDatabaseSync(NOMBRE);
  db.execSync(`PRAGMA key = "x'${clave}'"`);
  cifrada = db.getFirstSync('PRAGMA cipher_version') !== null;
  migrar((sql) => db.execSync(sql), versionDe(db));
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export type Todo = { palabras: Palabra[]; repasos: Repaso[]; ultimaCopia: string | null };

function kv<T>(clave: string): T | null {
  const fila = db.getFirstSync<{ valor: string }>('SELECT valor FROM kv WHERE clave = ?', clave);
  return fila ? (JSON.parse(fila.valor) as T) : null;
}

export function cargar(): Todo {
  return {
    palabras: db.getAllSync<Palabra>(
      'SELECT id, ingles, espanol, pronunciacion, categoria, creada FROM palabras ORDER BY creada',
    ),
    repasos: db.getAllSync<Repaso>('SELECT palabra, modo, intervalo, facilidad, toca, ultimo FROM repasos'),
    ultimaCopia: kv<string>('ultimaCopia'),
  };
}

// ── Escritura ────────────────────────────────────────────────────────────────
// INSERT … ON CONFLICT DO UPDATE y nunca INSERT OR REPLACE: el REPLACE borra la fila y
// la vuelve a crear, y con eso se lleva por delante lo que no se haya nombrado.

export const guardarPalabra = (p: Palabra) =>
  db.runSync(
    `INSERT INTO palabras (id, ingles, espanol, pronunciacion, categoria, creada) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET ingles = excluded.ingles, espanol = excluded.espanol,
       pronunciacion = excluded.pronunciacion, categoria = excluded.categoria`,
    [p.id, p.ingles, p.espanol, p.pronunciacion, p.categoria, p.creada],
  );

export const guardarRepaso = (r: Repaso) =>
  db.runSync(
    `INSERT INTO repasos (palabra, modo, intervalo, facilidad, toca, ultimo) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (palabra, modo) DO UPDATE SET intervalo = excluded.intervalo,
       facilidad = excluded.facilidad, toca = excluded.toca, ultimo = excluded.ultimo`,
    [r.palabra, r.modo, r.intervalo, r.facilidad, r.toca, r.ultimo],
  );

/** La palabra y su programación, juntas: una palabra sin repasos vuelve a ser nueva. */
export function borrarPalabra(id: string) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM repasos WHERE palabra = ?', id);
    db.runSync('DELETE FROM palabras WHERE id = ?', id);
  });
}

/** Deshacer un borrado: vuelve la palabra con la programación que tenía. */
export function restaurarPalabra(p: Palabra, repasos: Repaso[]) {
  db.withTransactionSync(() => {
    guardarPalabra(p);
    repasos.forEach(guardarRepaso);
  });
}

export const guardarKv = (clave: 'ultimaCopia', valor: unknown) =>
  db.runSync('INSERT INTO kv (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor', [
    clave,
    JSON.stringify(valor),
  ]);
