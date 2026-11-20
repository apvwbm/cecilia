// Home: los tres botones del diseño, y debajo de "Revise" lo que queda por hoy.
// La copia de seguridad va aparte, en la esquina: no es un apartado más.

import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { estilos, Pulsable } from '@/components/ui';
import { hoyISO } from '@/lib/fechas';
import { pendientes } from '@/lib/repaso';
import { useApp } from '@/store/app';
import { colores, espacio, radio, typo } from '@/theme';

function BotonHome({ titulo, detalle, ruta }: { titulo: string; detalle?: string; ruta: Href }) {
  return (
    <Pulsable style={s.boton} escala={0.97} onPress={() => router.push(ruta)}>
      <Text style={[typo.boton, s.tinta]} numberOfLines={1} adjustsFontSizeToFit>
        {titulo}
      </Text>
      {detalle && <Text style={[typo.apoyo, s.detalle]}>{detalle}</Text>}
    </Pulsable>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const palabras = useApp((x) => x.palabras);
  const repasos = useApp((x) => x.repasos);
  const quedan = pendientes(palabras, repasos, hoyISO()).length;

  const detalle = palabras.length === 0 ? undefined : quedan > 0 ? `${quedan} to revise` : 'All done for today';

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.arriba}>
        <Pressable onPress={() => router.push('/copia')} hitSlop={16} accessibilityLabel="Backup">
          <Feather name="save" size={22} color={colores.tintaSuave} />
        </Pressable>
      </View>
      <View style={s.botones}>
        <BotonHome titulo="Consult your list" ruta="/lista" />
        <BotonHome titulo="Revise" detalle={detalle} ruta="/repaso" />
        <BotonHome titulo="Add to your list" ruta="/palabra" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  arriba: { alignItems: 'flex-end', paddingHorizontal: espacio.xl, paddingTop: espacio.lg },
  botones: { flex: 1, justifyContent: 'center', gap: espacio.lg, paddingHorizontal: espacio.xl + espacio.xs, paddingBottom: 56 },
  boton: {
    height: 116,
    borderRadius: radio.lg + 4,
    backgroundColor: colores.hoja,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.xl,
  },
  tinta: { color: colores.tinta },
  detalle: { color: colores.tintaSuave, marginTop: 2 },
});
