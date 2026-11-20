# CLAUDE.md

## Qué es Cecilia

App Android privada para que May practique el vocabulario de inglés de C1, al estilo Anki.
La diseñó ella (el PDF de Canva con las 7 pantallas), así que el aspecto va **fiel al
diseño**: crema `#FFF4C5`, tinta índigo para el inglés, rojo oscuro en negrita cursiva para
el español y azul claro para la `/pronunciación/`. Las caras de puntuar y la flecha son sus
dibujos, recortados del PDF (`assets/images/cara-*.png`, `flecha.png`: trazo blanco con
transparencia, se tiñen con `tintColor`).

- **Interfaz en inglés** (es para practicar); código y comentarios en castellano.
- Tres apartados en la Home: **Your list** (libreta con pestañas por categoría), **Revise**
  (tarjetas) y **Add**. La copia de seguridad, por el icono de la esquina.
- Fuente: Plus Jakarta Sans, la de Google Fonts más parecida a Canva Sans (que es de Canva y
  no se puede distribuir).

Proyectos hermanos: `../etxea` (de ahí salen `Pulsable`, `fechas`, `normaliza`, el patrón
del teclado y `scripts/apk.mjs`) y `../catffeine` (de ahí sale todo el almacenamiento).

## Comandos

- `npm start` — Expo Go. Ojo: en Expo Go no hay SQLCipher, la base va sin cifrar y las
  copias se niegan a funcionar.
- `npm run typecheck`, `npm run lint`, `npx expo-doctor`.
- `npm run verifica` — asserts a mano de la lógica pura (programación, sesión, fechas) y de
  las migraciones con `node:sqlite`. Lógica nueva y pura, aquí.
- `npx expo export --platform android --output-dir <tmp>` — prueba de humo sin móvil.
- `npm run apk` — prebuild + release y lo copia al Escritorio. Necesita el Android SDK.

**Siempre `npm run apk`, nunca EAS.** Los datos solo viven en el móvil: un APK firmado con
otra clave obliga a desinstalar, y desinstalar lo borra todo.

## Datos: en el móvil, cifrados (patrón Catffeine)

- expo-sqlite con **SQLCipher**; la clave son 32 bytes en SecureStore. `allowBackup: false` y
  sin permiso de INTERNET.
- Migraciones en `src/lib/esquema.ts` con `PRAGMA user_version`. **Nunca se edita una
  publicada**: se añade otra al final, solo cambios aditivos.
- `INSERT … ON CONFLICT DO UPDATE`, nunca `INSERT OR REPLACE`.
- Store (`src/store/app.ts`): primero SQLite (síncrono), luego `set()`.
- **Copia de seguridad**: exportar e importar con contraseña (`sqlcipher_export`). Es la
  única red: la copia automática de Android no serviría, la clave está en el Keystore.
  Importar reemplaza todo.
- Tablas: `palabras` (inglés, español, pronunciación sin barras, categoría con CHECK),
  `repasos` (una fila por palabra y modo; sin fila = nueva) y `kv` (`ultimaCopia`). Sin
  FOREIGN KEY: borrar una palabra borra sus repasos en la misma transacción.

## Lógica de repaso (`src/lib/repaso.ts`, pura)

- Cada palabra son **dos tarjetas** con programación propia: **pensar** (ve el inglés,
  piensa el español) y **escribir** (ve el español, escribe el inglés). Reconocer y
  producir no son lo mismo.
- **Puntúa ella** (OK, más o menos, KO). Nada se corrige solo, ni siquiera se compara lo
  escrito con la respuesta: decidió May que no.
- SM-2 de tres botones, con los **días reales** desde el último repaso. KO: vuelve hoy y
  baja la facilidad 20. Más o menos: ×1,2 y −15. OK: × facilidad y +5 (sin el +5 una
  palabra fallada una vez quedaría hundida para siempre). OK seguidos: 1, 3, 8, 20, 50…
  Acertar por adelantado **nunca acerca** la fecha.
- **Se repasa sin límite**, nada de "una vez al día": lo pidió May. Al entrar en Revise
  elige cuántas palabras (10, 20, 30, 50 o un número escrito), y al acabar "Revise again"
  vuelve a preguntar con el último número marcado.
- Cada ronda la elige `eligeSesion()` por prioridad: las que tocan (las más atrasadas
  primero), las nuevas (por orden de alta), las que aún no tocan por la fecha en que
  tocarían (las rojas antes, que tienen el intervalo corto) y, al final, las ya vistas hoy.
  Así cada ronda trae otras palabras y las de hoy solo vuelven cuando no queda nada más.
- **Repetir una tarjeta el mismo día es práctica**: la facilidad cambia como mucho una vez
  al día y un OK repetido conserva la fecha. Sin eso, acertar cinco veces seguidas por la
  tarde la mandaría a un mes. Un fallo sí la devuelve a hoy, se repita o no.
- La ronda mezcla los dos modos, barajados, y **las dos tarjetas de una palabra nunca van
  seguidas**. Una roja vuelve 4 tarjetas después y no cuenta como hecha hasta superarla:
  el contador es "superadas / total".
- El cronómetro cuenta hacia arriba, sin límite, sigue sumando entre rondas y se pausa con
  la app en segundo plano.

## Trampas heredadas (no reintroducir)

- Animaciones con `withTiming` + `Easing.out/inOut(quad)`, sin muelles salvo en `Pulsable`.
- Sin `elevation` en lo que se anima: el mazo son dos `View` grises, no sombras.
- Nada de `<StatusBar />`: `setStatusBarStyle('dark')` una vez en `_layout`.
- Teclado: `EspacioTeclado` (`useAnimatedKeyboard`); con edge-to-edge el teclado tapa.
- Fechas `'YYYY-MM-DD'` locales; nunca `toISOString()`. `diasEntre` va por `Date.UTC`.

## Icono

Un bocadillo de diálogo (hablar inglés) convertido en una cara con gafas (estudiar): la
misma idea que el gato-"t" de Catffeine, una sola figura blanca y plana sobre el índigo de
la app. Lo genera `python3 scripts/iconos.py` (Pillow), que escribe `icon.png`,
`adaptive-icon.png` y `monochrome-icon.png`; solo hay que volver a ejecutarlo si cambia el
dibujo. Recuerda: `app.json` no llega al APK sin `prebuild`, que `npm run apk` ya hace.

## Pendiente

- Nada de lo visual se ha visto en un móvil todavía: giro de la tarjeta, libreta, pestañas
  giradas, campo de pronunciación con barras y teclado en el modo escribir.
