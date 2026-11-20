// Normalización de texto para comparar y ordenar (copiado de Etxea).
//
// Se ordena comparando la forma normalizada y no con `Intl.Collator`, para no depender de
// si el Hermes del móvil trae ICU completo.

// Marcas diacríticas que NFD deja sueltas. Se construye con `new RegExp` y escapes
// dobles para que el patrón no dependa de la codificación del archivo.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normaliza(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export const comparaTexto = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** La pronunciación se guarda sin barras: si las escribe ella, se quitan. */
export const limpiaPron = (texto: string): string => texto.trim().replace(/^\/+|\/+$/g, '').trim();
