// Your list: la libreta, una pestaña por categoría y en orden alfabético. Tocar una
// palabra la abre para editarla.

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Libreta } from '@/components/Libreta';
import { Cabecera, estilos } from '@/components/ui';
import { comparaTexto, normaliza } from '@/lib/texto';
import { useApp } from '@/store/app';
import { espacio } from '@/theme';
import type { Categoria } from '@/types';

export default function Lista() {
  const insets = useSafeAreaInsets();
  const palabras = useApp((x) => x.palabras);
  const [categoria, setCategoria] = useState<Categoria>('nouns');

  const deLaPestana = palabras
    .filter((p) => p.categoria === categoria)
    .sort((a, b) => comparaTexto(normaliza(a.ingles), normaliza(b.ingles)));

  return (
    <View style={estilos.pantalla}>
      <Cabecera titulo="Your list" />
      <View style={{ flex: 1, paddingTop: espacio.md, paddingBottom: insets.bottom + espacio.lg }}>
        <Libreta
          palabras={deLaPestana}
          categoria={categoria}
          onCategoria={setCategoria}
          onTocar={(p) => router.push({ pathname: '/palabra', params: { id: p.id } })}
          onAnadir={() => router.push({ pathname: '/palabra', params: { categoria: categoria } })}
        />
      </View>
    </View>
  );
}
