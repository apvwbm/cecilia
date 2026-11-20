// Genera el APK de release y lo copia al Escritorio. Windows y Linux.
//
// Pasa por `expo prebuild` antes de compilar, porque Gradle compila lo que hay en
// `android/` y no mira `app.json`. Las arquitecturas van por parámetro y no en
// `android/gradle.properties`, donde un `prebuild --clean` las devolvía a las cuatro.
//
// En Windows usa CMake 3.31.6 del SDK de Android: el 3.22.1 por defecto trae ninja
// 1.10, que no soporta rutas de más de 260 caracteres y falla compilando el C++ de
// Reanimated. Instalar una vez: sdkmanager "cmake;3.31.6". En Linux ese límite no
// existe y vale el CMake que traiga el SDK.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const windows = process.platform === 'win32';
const aBarras = (ruta) => ruta.replaceAll('\\', '/');

const sdk =
  process.env.ANDROID_HOME ||
  join(homedir(), windows ? 'AppData/Local/Android/Sdk' : 'Android/Sdk');
if (!existsSync(sdk)) {
  console.error(`No encuentro el SDK de Android en ${sdk}. Instálalo o define ANDROID_HOME.`);
  process.exit(1);
}

const propiedades = [`sdk.dir=${aBarras(sdk)}`];
if (windows) {
  const cmake = join(sdk, 'cmake', '3.31.6');
  if (!existsSync(cmake)) {
    console.error(`Falta CMake 3.31.6 en ${cmake}. Instálalo con: sdkmanager "cmake;3.31.6"`);
    process.exit(1);
  }
  propiedades.push(`cmake.dir=${aBarras(cmake)}`);
}

// El Escritorio no se llama igual en todas partes: en un Linux en castellano es
// ~/Escritorio, y quien lo sabe es `xdg-user-dir`.
const escritorio = () => {
  if (!windows) {
    try {
      return execSync('xdg-user-dir DESKTOP', { encoding: 'utf8' }).trim();
    } catch {
      // Sin xdg-user-dir se cae al nombre de siempre.
    }
  }
  return join(homedir(), 'Desktop');
};

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

run('npx expo prebuild -p android --no-install');
writeFileSync('android/local.properties', `${propiedades.join('\n')}\n`);
run(
  `${windows ? '.\\gradlew.bat' : './gradlew'} assembleRelease --no-daemon -PreactNativeArchitectures=armeabi-v7a,arm64-v8a`,
  'android',
);

const destino = join(escritorio(), 'cecilia.apk');
copyFileSync('android/app/build/outputs/apk/release/app-release.apk', destino);
console.log(`\nAPK listo: ${destino}`);
