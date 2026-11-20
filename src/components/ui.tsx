// Piezas compartidas: el gesto de pulsar, la cabecera, el mazo de tarjetas, los botones,
// las caras y el aviso flotante.

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  SlideInDown,
  SlideOutDown,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cerrarAviso, useApp } from '@/store/app';
import { colores, coloresNota, DESPLAZAMIENTO_MAZO, espacio, radio, typo } from '@/theme';
import type { Nota } from '@/types';

// ── Pulsable (de Etxea) ──────────────────────────────────────────────────────
// Pressable con respuesta táctil: encoge con un muelle y da un toque háptico. Es el
// gesto base de toda la app, para que nada se sienta inerte.

const PressableAnimado = Animated.createAnimatedComponent(Pressable);
const MUELLE = { damping: 18, stiffness: 260, mass: 0.6 } as const;

type PropsPulsable = {
  onPress?: () => void;
  disabled?: boolean;
  /** Cuánto encoge al pulsar. Los elementos grandes necesitan menos. */
  escala?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: ReactNode;
};

export function Pulsable({ onPress, disabled = false, escala = 0.96, style, accessibilityLabel, children }: PropsPulsable) {
  const presionado = useSharedValue(0);
  const animado = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - presionado.value * (1 - escala) }],
  }));

  return (
    <PressableAnimado
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        presionado.value = withSpring(1, MUELLE);
      }}
      onPressOut={() => {
        presionado.value = withSpring(0, MUELLE);
      }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={[style, animado]}
    >
      {children}
    </PressableAnimado>
  );
}

// ── Cabecera ─────────────────────────────────────────────────────────────────
// La píldora blanca de arriba a la derecha es la del diseño; el chevron no estaba, pero
// sin él la única salida sería el gesto de atrás de Android.

export function Cabecera({ titulo }: { titulo: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.cabecera, { paddingTop: insets.top + espacio.sm }]}>
      <Pressable onPress={() => router.back()} hitSlop={16} accessibilityLabel="Back">
        <Feather name="chevron-left" size={30} color={colores.tinta} />
      </Pressable>
      <View style={s.pildora}>
        <Text style={[typo.pildora, { color: colores.tinta }]}>{titulo}</Text>
      </View>
    </View>
  );
}

// ── Mazo ─────────────────────────────────────────────────────────────────────
// La tarjeta blanca con las dos de detrás asomando abajo a la derecha. Son dos `View`
// planos y no sombras: la `elevation` de Android deja rectángulos fantasma al animar.
// El hijo es la tarjeta de arriba (con `estilos.carta`), para que pueda animarse sola.

export function Mazo({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[s.mazo, style]}>
      <View style={[s.capa, s.capa2]} />
      <View style={[s.capa, s.capa1]} />
      {children}
    </View>
  );
}

// ── Botones ──────────────────────────────────────────────────────────────────

type PropsBoton = {
  texto: string;
  onPress: () => void;
  /** `claro` es el secundario: blanco con la tinta encima. */
  claro?: boolean;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Boton({ texto, onPress, claro = false, deshabilitado = false, style }: PropsBoton) {
  return (
    <Pulsable
      onPress={onPress}
      disabled={deshabilitado}
      style={[s.boton, claro && s.botonClaro, deshabilitado && s.apagado, style]}
    >
      <Text style={[typo.pildora, s.botonTexto, { color: claro ? colores.tinta : colores.blanco }]}>{texto}</Text>
    </Pulsable>
  );
}

/** Las tres caras dibujadas por May. */
export const IMAGEN_NOTA = {
  ok: require('../../assets/images/cara-ok.png'),
  regular: require('../../assets/images/cara-regular.png'),
  ko: require('../../assets/images/cara-ko.png'),
} as const;

export const FLECHA = require('../../assets/images/flecha.png');

const ETIQUETA_NOTA: Record<Nota, string> = { ok: 'I knew it', regular: 'More or less', ko: "I didn't know it" };

/** Un cuadrado de color con su cara. `tamano` fijo para los pequeños del resumen. */
export function Cara({ nota, tamano, onPress }: { nota: Nota; tamano?: number; onPress?: () => void }) {
  const caja = [
    s.cara,
    { backgroundColor: coloresNota[nota].fondo, borderColor: coloresNota[nota].borde },
    tamano ? { width: tamano, borderRadius: tamano * 0.24, borderWidth: 2 } : s.caraFlexible,
  ];
  const dibujo = <Image source={IMAGEN_NOTA[nota]} style={s.caraDibujo} resizeMode="contain" />;
  if (!onPress) return <View style={caja}>{dibujo}</View>;
  return (
    <Pulsable onPress={onPress} style={caja} escala={0.92} accessibilityLabel={ETIQUETA_NOTA[nota]}>
      {dibujo}
    </Pulsable>
  );
}

// ── Sacudida ─────────────────────────────────────────────────────────────────
// Lo que pasa cuando se intenta guardar algo incompleto: tiembla y vibra, sin Alert.

export function useSacudida() {
  const x = useSharedValue(0);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const sacudir = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    x.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 70 }),
        withTiming(-6, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  };
  return [estilo, sacudir] as const;
}

// ── Teclado ──────────────────────────────────────────────────────────────────
// Con edge-to-edge el teclado tapa en vez de encoger la pantalla: este hueco, al final
// del contenido, va sincronizado con él en el hilo de UI (como en Etxea).

export function EspacioTeclado() {
  const insets = useSafeAreaInsets();
  const teclado = useAnimatedKeyboard();
  const alto = useAnimatedStyle(() => ({ height: Math.max(0, teclado.height.value - insets.bottom) }));
  return <Animated.View style={alto} />;
}

// ── Aviso flotante (de Catffeine) ────────────────────────────────────────────

const DURACION_AVISO = 4500;

export function AvisoFlotante() {
  const aviso = useApp((x) => x.aviso);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(cerrarAviso, DURACION_AVISO);
    return () => clearTimeout(id);
  }, [aviso]);

  if (!aviso) return null;
  return (
    <Animated.View
      key={aviso.id}
      // Sin muelle: entra deslizando y para en seco.
      entering={SlideInDown.duration(220).easing(Easing.out(Easing.quad))}
      exiting={SlideOutDown.duration(160).easing(Easing.in(Easing.quad))}
      style={[s.aviso, { bottom: insets.bottom + espacio.lg }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[typo.apoyo, s.avisoTexto]} numberOfLines={2}>
        {aviso.texto}
      </Text>
      {aviso.deshacer && (
        <Pressable
          onPress={() => {
            aviso.deshacer?.();
            cerrarAviso();
          }}
          hitSlop={10}
          style={s.avisoBoton}
          accessibilityRole="button"
        >
          <Feather name="rotate-ccw" size={14} color={colores.blanco} />
          <Text style={[typo.pildora, s.avisoTexto]}>Undo</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  /** La tarjeta de arriba del mazo. */
  carta: { backgroundColor: colores.hoja, borderRadius: radio.lg },
});

const s = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.sm,
  },
  pildora: {
    backgroundColor: colores.hoja,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.xl + espacio.sm,
    paddingVertical: espacio.md,
  },
  mazo: {
    paddingRight: DESPLAZAMIENTO_MAZO * 2,
    paddingBottom: DESPLAZAMIENTO_MAZO * 2,
  },
  capa: { position: 'absolute', borderRadius: radio.lg },
  capa1: {
    top: DESPLAZAMIENTO_MAZO,
    left: DESPLAZAMIENTO_MAZO,
    right: DESPLAZAMIENTO_MAZO,
    bottom: DESPLAZAMIENTO_MAZO,
    backgroundColor: colores.mazo1,
  },
  capa2: {
    top: DESPLAZAMIENTO_MAZO * 2,
    left: DESPLAZAMIENTO_MAZO * 2,
    right: 0,
    bottom: 0,
    backgroundColor: colores.mazo2,
  },
  boton: {
    height: 56,
    borderRadius: radio.pill,
    backgroundColor: colores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.xl,
  },
  botonClaro: { backgroundColor: colores.hoja },
  botonTexto: { fontSize: 17 },
  apagado: { opacity: 0.4 },
  cara: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  caraFlexible: { flex: 1, borderRadius: radio.lg, borderWidth: 3 },
  caraDibujo: { width: '64%', height: '64%' },
  aviso: {
    position: 'absolute',
    left: espacio.xl,
    right: espacio.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    minHeight: 50,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
    borderRadius: radio.md,
    backgroundColor: colores.tinta,
  },
  avisoTexto: { color: colores.blanco, flexShrink: 1 },
  avisoBoton: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
});
