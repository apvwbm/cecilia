// Esquema de la base de datos (patrón de Catffeine). Sin dependencias de Expo, para que
// `scripts/verifica.ts` pueda probar las migraciones con el `node:sqlite` de Node.
//
// MIGRACIONES: cada entrada es el SQL que lleva de la versión i a la i + 1, y la versión
// vive en `PRAGMA user_version`. Reglas para no perder datos nunca:
//   - NUNCA editar una migración publicada; añadir otra al final.
//   - Solo cambios aditivos (`ADD COLUMN` con DEFAULT, tablas nuevas). Si hace falta
//     reestructurar una tabla: crear la nueva, copiar, borrar la vieja, renombrar.
// Las copias de seguridad llevan su `user_version`, así que una copia antigua se importa
// pasando por estas mismas migraciones.

export const MIGRACIONES: string[] = [
  // 1 — esquema inicial.
  // `repasos` no lleva FOREIGN KEY: SQLite las ignora salvo con `PRAGMA foreign_keys` en
  // cada conexión. Borrar una palabra borra sus repasos en la misma transacción (`db.ts`).
  // Las categorías van con CHECK y escritas a mano, no generadas desde `theme.ts`: una
  // migración publicada no puede cambiar si cambia una constante.
  `
  CREATE TABLE kv (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);

  CREATE TABLE palabras (
    id TEXT PRIMARY KEY NOT NULL,
    ingles TEXT NOT NULL CHECK (length(trim(ingles)) > 0),
    espanol TEXT NOT NULL CHECK (length(trim(espanol)) > 0),
    pronunciacion TEXT NOT NULL DEFAULT '',
    categoria TEXT NOT NULL CHECK (categoria IN ('nouns', 'verbs', 'adjectives', 'idioms', 'adverbs')),
    creada INTEGER NOT NULL
  );

  CREATE TABLE repasos (
    palabra TEXT NOT NULL,
    modo TEXT NOT NULL CHECK (modo IN ('pensar', 'escribir')),
    intervalo INTEGER NOT NULL CHECK (intervalo >= 0),
    facilidad INTEGER NOT NULL,
    toca TEXT NOT NULL,
    ultimo TEXT NOT NULL,
    PRIMARY KEY (palabra, modo)
  );
  `,
];

export const VERSION_ESQUEMA = MIGRACIONES.length;

/** Las tablas con datos (para copiar y para borrar). */
export const TABLAS = ['kv', 'palabras', 'repasos'] as const;

/**
 * Aplica las migraciones pendientes, cada una en su transacción junto con el cambio de
 * versión: o entra entera o no entra. `exec` abstrae el driver (expo-sqlite en la app,
 * node:sqlite en la verificación).
 */
export function migrar(exec: (sql: string) => void, version: number): number {
  if (version > VERSION_ESQUEMA) throw new Error('version-futura');
  for (let v = version; v < VERSION_ESQUEMA; v++) {
    try {
      exec(`BEGIN; ${MIGRACIONES[v]}; PRAGMA user_version = ${v + 1}; COMMIT;`);
    } catch (e) {
      exec('ROLLBACK');
      throw e;
    }
  }
  return VERSION_ESQUEMA;
}
