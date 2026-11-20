// El estado de la app: un único store con todos los datos en memoria (patrón Catffeine).
//
// Contrato de cada acción: primero SQLite (síncrono), luego `set()`. Así lo que se ve es
// siempre lo que está guardado, y la pantalla cambia en el mismo tick.
//
// Lo calculado (qué toca hoy, la sesión) NO vive aquí: se deriva con las funciones puras
// de `lib/repaso.ts`.

import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import * as db from '@/lib/db';
import { hoyISO } from '@/lib/fechas';
import { programa } from '@/lib/repaso';
import type { Nota, Palabra, Tarjeta } from '@/types';

export type Aviso = { texto: string; deshacer?: () => void; id: number };

type Estado = db.Todo & {
  cargado: boolean;
  aviso: Aviso | null;
};

export const useApp = create<Estado>(() => ({
  cargado: false,
  aviso: null,
  palabras: [],
  repasos: [],
  ultimaCopia: null,
}));

const get = useApp.getState;
const set = useApp.setState;

// ── Arranque ─────────────────────────────────────────────────────────────────

export async function iniciar() {
  await db.abrir();
  set({ ...db.cargar(), cargado: true });
}

/** Tras importar una copia. */
export const recargar = () => set({ ...db.cargar() });

// ── Avisos ───────────────────────────────────────────────────────────────────

let siguienteAviso = 0;
export const avisar = (texto: string, deshacer?: () => void) =>
  set({ aviso: { texto: texto, deshacer: deshacer, id: ++siguienteAviso } });
export const cerrarAviso = () => set({ aviso: null });

// ── Palabras ─────────────────────────────────────────────────────────────────

export type DatosPalabra = Omit<Palabra, 'id' | 'creada'>;

function guardar(p: Palabra) {
  db.guardarPalabra(p);
  const lista = get().palabras;
  set({ palabras: lista.some((x) => x.id === p.id) ? lista.map((x) => (x.id === p.id ? p : x)) : [...lista, p] });
}

function quitar(id: string) {
  db.borrarPalabra(id);
  set({
    palabras: get().palabras.filter((p) => p.id !== id),
    repasos: get().repasos.filter((r) => r.palabra !== id),
  });
}

/** Una palabra nueva, con deshacer: el formulario sigue abierto para encadenar otra. */
export function anadirPalabra(datos: DatosPalabra) {
  const p: Palabra = { ...datos, id: randomUUID(), creada: Date.now() };
  guardar(p);
  avisar(`Added “${p.ingles}”`, () => quitar(p.id));
}

/** Editar no toca la programación: corregir una errata no la devuelve a nueva. */
export function editarPalabra(id: string, datos: DatosPalabra) {
  const antes = get().palabras.find((p) => p.id === id);
  if (antes) guardar({ ...antes, ...datos });
}

export function borrarPalabra(id: string) {
  const antes = get().palabras.find((p) => p.id === id);
  if (!antes) return;
  const repasos = get().repasos.filter((r) => r.palabra === id);
  quitar(id);
  avisar(`Deleted “${antes.ingles}”`, () => {
    db.restaurarPalabra(antes, repasos);
    set({ palabras: [...get().palabras, antes], repasos: [...get().repasos, ...repasos] });
  });
}

// ── Repaso ───────────────────────────────────────────────────────────────────

/** Cada respuesta se guarda al momento: salir a mitad de sesión no pierde nada. */
export function responder(tarjeta: Tarjeta, nota: Nota) {
  const repasos = get().repasos;
  const previo = repasos.find((r) => r.palabra === tarjeta.palabra && r.modo === tarjeta.modo);
  const nuevo = programa(previo, tarjeta, nota, hoyISO());
  db.guardarRepaso(nuevo);
  set({ repasos: previo ? repasos.map((r) => (r === previo ? nuevo : r)) : [...repasos, nuevo] });
}

// ── Copias ───────────────────────────────────────────────────────────────────

export function apuntarCopia() {
  const hoy = hoyISO();
  db.guardarKv('ultimaCopia', hoy);
  set({ ultimaCopia: hoy });
}
