// Revise: primero pregunta cuántas palabras, luego la sesión de tarjetas y al final el
// resumen, desde el que se puede volver a empezar sin límite.
//
// Cada ronda se elige con `eligeSesion`: lo que toca, lo nuevo y después lo que tocaría
// antes, así que volver a darle trae otras palabras. Cada respuesta se guarda al momento,
// y salir a mitad no pierde nada. Una roja vuelve unas tarjetas después y no cuenta como
// hecha hasta que se supera, por eso el contador es "superadas / total" y no la posición.
//
// El cronómetro cuenta hacia arriba, sin límite, solo mientras hay tarjetas y la app está
// delante; sigue sumando entre rondas.

import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Image, Keyboard, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TarjetaRepaso } from '@/components/TarjetaRepaso';
import { Boton, Cabecera, Cara, EspacioTeclado, estilos, FLECHA, Mazo, Pulsable, useSacudida } from '@/components/ui';
import { duracion, hoyISO } from '@/lib/fechas';
import { eligeSesion, pendientes, siguiente } from '@/lib/repaso';
import { responder, useApp } from '@/store/app';
import { colores, espacio, fuentes, radio, typo } from '@/theme';
import type { Nota, Tarjeta } from '@/types';

type Sesion = { cola: Tarjeta[]; total: number; recuento: Record<Nota, number> };

const NOTAS: Nota[] = ['ok', 'regular', 'ko'];
const OPCIONES = [10, 20, 30, 50];
const POR_DEFECTO = 20;
const MAXIMO_ESCRITO = 3; // cifras: hasta 999
/** Un doble toque en una cara no debe destapar la tarjeta siguiente. */
const PAUSA_TRAS_PUNTUAR = 350;
/** Lo más alta que se hace la tarjeta respecto a su ancho; con el teclado abierto, encoge. */
const PROPORCION_CARTA = 0.85;

const nuevaSesion = (cola: Tarjeta[]): Sesion => ({ cola: cola, total: cola.length, recuento: { ok: 0, regular: 0, ko: 0 } });

/** Milisegundos de repaso: corre con `enMarcha` y la app delante, y no se reinicia entre rondas. */
function useCronometro(enMarcha: boolean): number {
  const [ms, setMs] = useState(0);
  const acumulado = useRef(0);

  useEffect(() => {
    if (!enMarcha) return;
    let desde: number | null = AppState.currentState === 'active' ? Date.now() : null;
    const pausa = () => {
      if (desde === null) return;
      acumulado.current += Date.now() - desde;
      desde = null;
    };
    const id = setInterval(() => setMs(acumulado.current + (desde === null ? 0 : Date.now() - desde)), 1000);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') pausa();
      else if (desde === null) desde = Date.now();
    });
    return () => {
      pausa();
      clearInterval(id);
      sub.remove();
      setMs(acumulado.current);
    };
  }, [enMarcha]);

  return ms;
}

export default function Repaso() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const palabras = useApp((x) => x.palabras);
  const repasos = useApp((x) => x.repasos);

  /** `null` mientras elige cuántas. */
  const [sesion, setSesion] = useState<Sesion | null>(null);
  /** Lo último que eligió: "Revise again" vuelve con eso marcado. */
  const [cuantas, setCuantas] = useState(POR_DEFECTO);
  const [revelada, setRevelada] = useState(false);
  const [detras, setDetras] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  /** Cambia en cada respuesta: es la `key` de la tarjeta, para que entre y salga animada. */
  const [vuelta, setVuelta] = useState(0);
  const bloqueada = useRef(false);

  // Tras puntuar, la flecha de la tarjeta nueva aparece justo donde estaba la cara de en
  // medio: durante un momento no responde, o un doble toque destaparía la respuesta.
  useEffect(() => {
    if (vuelta === 0) return;
    bloqueada.current = true;
    const id = setTimeout(() => {
      bloqueada.current = false;
    }, PAUSA_TRAS_PUNTUAR);
    return () => clearTimeout(id);
  }, [vuelta]);

  const enMarcha = sesion !== null && sesion.cola.length > 0;
  const tiempo = useCronometro(enMarcha);
  const actual = sesion?.cola[0];
  const palabra = actual && palabras.find((p) => p.id === actual.palabra);
  const lado = (width - espacio.pantalla * 2 - espacio.lg * 2) / 3;

  const empezar = (n: number) => {
    setCuantas(n);
    setSesion(nuevaSesion(eligeSesion(palabras, repasos, hoyISO(), n)));
  };

  const revelar = () => {
    if (bloqueada.current) return;
    Keyboard.dismiss();
    setRevelada(true);
    setDetras(true);
  };

  const puntuar = (nota: Nota) => {
    if (!actual) return;
    responder(actual, nota);
    setSesion((s) =>
      s && { ...s, cola: siguiente(s.cola, nota), recuento: { ...s.recuento, [nota]: s.recuento[nota] + 1 } },
    );
    setRevelada(false);
    setDetras(false);
    setRespuesta('');
    setVuelta((v) => v + 1);
  };

  if (palabras.length === 0) {
    return (
      <Final
        titulo="Your list is empty"
        texto="Add some words first, and come back to revise them."
        botones={<Boton texto="Add to your list" onPress={() => router.replace('/palabra')} />}
      />
    );
  }

  if (!sesion) {
    return <Eleccion inicial={cuantas} quedan={pendientes(palabras, repasos, hoyISO()).length} onEmpezar={empezar} />;
  }

  if (!actual || !palabra) {
    return (
      <Final
        titulo="Well done!"
        resumen={
          <View style={s.resumen}>
            <View style={s.recuento}>
              {NOTAS.map((n) => (
                <View key={n} style={s.recuentoNota}>
                  <Cara nota={n} tamano={56} />
                  <Text style={[typo.cifra, s.tinta]}>{sesion.recuento[n]}</Text>
                </View>
              ))}
            </View>
            <Text style={[typo.texto, s.tinta]}>
              {sesion.total} {sesion.total === 1 ? 'word' : 'words'} · {duracion(tiempo)}
            </Text>
          </View>
        }
        botones={
          <>
            <Boton texto="Revise again" onPress={() => setSesion(null)} />
            <Boton texto="Home" claro onPress={() => router.back()} />
          </>
        }
      />
    );
  }

  return (
    <View style={estilos.pantalla}>
      <Cabecera titulo="Revise" />
      <View style={s.marcadores}>
        <Text style={[typo.cifra, s.tinta]}>
          {sesion.total - sesion.cola.length}/{sesion.total}
        </Text>
        <Text style={[typo.cifra, s.tinta]}>{duracion(tiempo)}</Text>
      </View>

      <View style={s.cuerpo}>
        <Mazo style={[s.mazo, { maxHeight: width * PROPORCION_CARTA }]}>
          <Animated.View
            key={vuelta}
            style={s.llena}
            entering={FadeIn.duration(180)}
            exiting={SlideOutLeft.duration(220).easing(Easing.in(Easing.quad))}
          >
            <TarjetaRepaso
              palabra={palabra}
              modo={actual.modo}
              revelada={revelada}
              detras={detras}
              respuesta={respuesta}
              onRespuesta={setRespuesta}
              onRevelar={revelar}
              onGirar={() => setDetras((d) => !d)}
            />
          </Animated.View>
        </Mazo>
      </View>

      {/* Mismo alto con la flecha que con las caras: cambiar de una a otra no mueve la tarjeta. */}
      <View style={[s.pie, { height: lado, marginBottom: insets.bottom + espacio.xl }]}>
        {revelada ? (
          <View style={s.caras}>
            {NOTAS.map((n) => (
              <Cara key={n} nota={n} onPress={() => puntuar(n)} />
            ))}
          </View>
        ) : (
          <Pulsable onPress={revelar} style={s.flecha} accessibilityLabel="Show the answer">
            <Image source={FLECHA} style={s.flechaImagen} resizeMode="contain" />
          </Pulsable>
        )}
      </View>
      <EspacioTeclado />
    </View>
  );
}

/**
 * Cuántas palabras: unas cuantas cantidades a un toque y un campo para cualquier otra.
 * Tocar una cantidad vacía el campo y escribir desmarca la cantidad: solo vale una.
 */
function Eleccion({ inicial, quedan, onEmpezar }: { inicial: number; quedan: number; onEmpezar: (n: number) => void }) {
  const insets = useSafeAreaInsets();
  const deLista = OPCIONES.includes(inicial);
  const [opcion, setOpcion] = useState<number | null>(deLista ? inicial : null);
  const [escrita, setEscrita] = useState(deLista ? '' : String(inicial));
  const [sacudida, sacudir] = useSacudida();

  const empezar = () => {
    const n = escrita ? Number(escrita) : opcion;
    if (!n) return sacudir();
    onEmpezar(n);
  };

  return (
    <View style={estilos.pantalla}>
      <Cabecera titulo="Revise" />
      <View style={s.final}>
        <Text style={[typo.boton, s.tinta, s.centro]}>How many words?</Text>
        <Text style={[typo.texto, s.apagado, s.centro]}>
          {quedan > 0 ? `${quedan} waiting for today` : 'Nothing due today. Practise as much as you like.'}
        </Text>
        <Animated.View style={[s.eleccion, sacudida]}>
          <View style={s.opciones}>
            {OPCIONES.map((n) => {
              const elegida = opcion === n;
              return (
                <Pulsable
                  key={n}
                  onPress={() => {
                    setOpcion(n);
                    setEscrita('');
                    Keyboard.dismiss();
                  }}
                  style={[s.opcion, elegida && s.opcionElegida]}
                  accessibilityLabel={`${n} words`}
                >
                  <Text style={[typo.pildora, s.opcionTexto, { color: elegida ? colores.blanco : colores.tinta }]}>
                    {n}
                  </Text>
                </Pulsable>
              );
            })}
          </View>
          <TextInput
            value={escrita}
            onChangeText={(t) => {
              setEscrita(t.replace(/\D/g, ''));
              setOpcion(null);
            }}
            placeholder="Or type a number"
            placeholderTextColor={colores.tintaSuave}
            keyboardType="number-pad"
            maxLength={MAXIMO_ESCRITO}
            returnKeyType="go"
            onSubmitEditing={empezar}
            style={[typo.pildora, s.escrita, escrita !== '' && s.escritaLlena]}
          />
        </Animated.View>
      </View>
      <View style={[s.botones, { paddingBottom: insets.bottom + espacio.xl }]}>
        <Boton texto="Start" onPress={empezar} />
      </View>
      <EspacioTeclado />
    </View>
  );
}

/** Lista vacía o fin de ronda: un mensaje y qué hacer ahora. */
function Final({
  titulo,
  texto,
  resumen,
  botones,
}: {
  titulo: string;
  texto?: string;
  resumen?: ReactNode;
  botones: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={estilos.pantalla}>
      <Cabecera titulo="Revise" />
      <View style={s.final}>
        <Text style={[typo.boton, s.tinta, s.centro]}>{titulo}</Text>
        {resumen}
        {texto && <Text style={[typo.texto, s.apagado, s.centro]}>{texto}</Text>}
      </View>
      <View style={[s.botones, { paddingBottom: insets.bottom + espacio.xl }]}>{botones}</View>
    </View>
  );
}

const s = StyleSheet.create({
  llena: { flex: 1 },
  tinta: { color: colores.tinta },
  apagado: { color: colores.tintaSuave },
  centro: { textAlign: 'center' },
  marcadores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.pantalla,
    paddingTop: espacio.md,
  },
  cuerpo: { flex: 1, justifyContent: 'center', paddingHorizontal: espacio.pantalla, paddingVertical: espacio.xl },
  mazo: { flex: 1 },
  pie: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacio.pantalla },
  caras: { flexDirection: 'row', gap: espacio.lg, alignSelf: 'stretch', height: '100%' },
  flecha: { padding: espacio.md },
  flechaImagen: { width: 104, height: 59, tintColor: colores.tinta },
  final: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: espacio.xl, paddingHorizontal: espacio.xxl },
  resumen: { alignItems: 'center', gap: espacio.lg },
  recuento: { flexDirection: 'row', gap: espacio.xl },
  recuentoNota: { alignItems: 'center', gap: espacio.sm },
  botones: { gap: espacio.md, paddingHorizontal: espacio.pantalla },
  eleccion: { alignItems: 'center', gap: espacio.lg, marginTop: espacio.sm },
  opciones: { flexDirection: 'row', gap: espacio.md },
  opcion: {
    width: 64,
    height: 56,
    borderRadius: radio.md,
    backgroundColor: colores.hoja,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionElegida: { backgroundColor: colores.tinta },
  opcionTexto: { fontSize: 20, lineHeight: 26 },
  escrita: {
    width: 64 * OPCIONES.length + espacio.md * (OPCIONES.length - 1),
    height: 56,
    borderRadius: radio.md,
    backgroundColor: colores.hoja,
    color: colores.tinta,
    textAlign: 'center',
    fontFamily: fuentes.medio,
  },
  // Con un número escrito, el campo se pinta como una cantidad elegida.
  escritaLlena: { backgroundColor: colores.tinta, color: colores.blanco, fontFamily: fuentes.negrita, fontSize: 20 },
});
