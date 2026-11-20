// Raíz: fuentes, apertura de la base cifrada y navegación.
//
// El splash se mantiene hasta que las fuentes Y los datos están listos, así la primera
// pantalla sale entera y sin parpadeos.

import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_700Bold_Italic,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setStatusBarStyle } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisoFlotante } from '@/components/ui';
import { iniciar, useApp } from '@/store/app';
import { colores } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function Raiz() {
  const [fuentes] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_700Bold_Italic,
    PlusJakartaSans_800ExtraBold,
  });
  const cargado = useApp((x) => x.cargado);

  useEffect(() => {
    void iniciar();
    // Iconos oscuros sobre el crema en toda la app. Con la función y NO con `<StatusBar />`:
    // en RN 0.88 ese componente puede dejar un hueco blanco bajo la barra (ver Etxea).
    setStatusBarStyle('dark');
    // El fondo de la ventana, para que no asome blanco entre pantallas.
    void SystemUI.setBackgroundColorAsync(colores.fondo);
  }, []);

  useEffect(() => {
    if (fuentes && cargado) void SplashScreen.hideAsync();
  }, [fuentes, cargado]);

  if (!fuentes || !cargado) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="lista" />
        <Stack.Screen name="repaso" />
        <Stack.Screen name="palabra" />
        <Stack.Screen name="copia" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <AvisoFlotante />
    </SafeAreaProvider>
  );
}
