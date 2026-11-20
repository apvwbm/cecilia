// La tarjeta de arriba del mazo durante el repaso.
//
// Pensar: delante el inglés; detrás el español y la pronunciación.
// Escribir: delante el español y el campo para escribir; detrás lo que ha escrito, la
// respuesta correcta y la pronunciación.
//
// El giro aplasta la tarjeta en horizontal hasta una línea y la vuelve a abrir con la
// otra cara: en Android es más fiable que un `rotateY` con `backfaceVisibility`. Las dos
// caras están siempre montadas y se cruzan por opacidad en el punto medio, así que no
// hace falta avisar al hilo de JS a mitad de animación.

import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { estilos, FLECHA } from '@/components/ui';
import { colores, espacio, fuentes, radio, typo } from '@/theme';
import type { Modo, Palabra } from '@/types';

const GIRO_MS = 240;

type Props = {
  palabra: Palabra;
  modo: Modo;
  /** Ya se ha visto la respuesta: abajo están las caras y la tarjeta se puede girar. */
  revelada: boolean;
  /** Qué cara se ve ahora. */
  detras: boolean;
  respuesta: string;
  onRespuesta: (texto: string) => void;
  onRevelar: () => void;
  onGirar: () => void;
};

export function TarjetaRepaso({ palabra, modo, revelada, detras, respuesta, onRespuesta, onRevelar, onGirar }: Props) {
  const giro = useSharedValue(0);

  useEffect(() => {
    giro.value = withTiming(detras ? 1 : 0, { duration: GIRO_MS, easing: Easing.inOut(Easing.quad) });
  }, [detras, giro]);

  const carta = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.01, Math.abs(1 - 2 * giro.value)) }],
  }));
  const delante = useAnimatedStyle(() => ({ opacity: giro.value < 0.5 ? 1 : 0 }));
  const atras = useAnimatedStyle(() => ({ opacity: giro.value < 0.5 ? 0 : 1 }));

  const pron = palabra.pronunciacion ? <Text style={[typo.pron, s.centro, s.pron]}>/{palabra.pronunciacion}/</Text> : null;

  // Con la respuesta vista, tocar en cualquier sitio gira. Antes, en pensar, tocar la
  // tarjeta es lo mismo que la flecha; en escribir, no: ahí se está tocando el campo.
  const alTocar = revelada ? onGirar : modo === 'pensar' ? onRevelar : undefined;

  return (
    <Pressable style={s.llena} onPress={alTocar} disabled={!alTocar} accessibilityHint={revelada ? 'Turns the card over' : undefined}>
      <Animated.View style={[estilos.carta, s.llena, carta]}>
        <Animated.View style={[s.cara, delante]} pointerEvents={revelada ? 'none' : 'auto'}>
          {modo === 'pensar' ? (
            <Text style={[typo.palabra, s.centro, { color: colores.tinta }]} adjustsFontSizeToFit numberOfLines={4}>
              {palabra.ingles}
            </Text>
          ) : (
            <>
              <Text style={[typo.traduccion, s.centro, { color: colores.rojo }]} adjustsFontSizeToFit numberOfLines={3}>
                {palabra.espanol}
              </Text>
              <View style={s.campo}>
                <TextInput
                  value={respuesta}
                  onChangeText={onRespuesta}
                  placeholder="Type your answer in English"
                  placeholderTextColor={colores.blancoSuave}
                  style={[typo.pildora, s.campoTexto]}
                  editable={!revelada}
                  autoFocus
                  // Es práctica de ortografía: el corrector la estaría haciendo por ella.
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                  returnKeyType="done"
                  onSubmitEditing={onRevelar}
                />
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View style={[s.cara, StyleSheet.absoluteFill, atras]} pointerEvents="none">
          {modo === 'pensar' ? (
            <>
              <Text style={[typo.traduccion, s.centro, { color: colores.rojo }]} adjustsFontSizeToFit numberOfLines={3}>
                {palabra.espanol}
              </Text>
              {pron}
            </>
          ) : (
            <>
              <Text style={[typo.texto, s.centro, s.suya]} numberOfLines={2}>
                {respuesta.trim() || 'No answer'}
              </Text>
              <Text style={[typo.palabra, s.centro, { color: colores.tinta }]} adjustsFontSizeToFit numberOfLines={3}>
                {palabra.ingles}
              </Text>
              {pron}
            </>
          )}
        </Animated.View>

        {revelada && <Image source={FLECHA} style={s.flechita} resizeMode="contain" />}
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  llena: { flex: 1 },
  cara: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, gap: espacio.sm },
  centro: { textAlign: 'center' },
  pron: { color: colores.azul },
  suya: { color: colores.tintaSuave, fontFamily: fuentes.negrita, fontSize: 20, lineHeight: 26 },
  campo: {
    alignSelf: 'stretch',
    marginTop: espacio.lg,
    backgroundColor: colores.tinta,
    borderRadius: radio.md,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: espacio.lg,
  },
  campoTexto: { color: colores.blanco, textAlign: 'center', fontSize: 17, paddingVertical: espacio.md },
  flechita: {
    position: 'absolute',
    right: espacio.lg,
    bottom: espacio.lg,
    width: 46,
    height: 26,
    tintColor: colores.tinta,
  },
});
