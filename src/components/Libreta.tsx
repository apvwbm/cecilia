// La hoja de libreta de "Your list": reglas azules, un punto por línea, los agujeros de
// la anilla y las pestañas de colores a la derecha.
//
// Las reglas no van con cada fila sino dibujadas detrás, con un paso fijo (`LINEA`), y
// el texto usa ese mismo `lineHeight`: así un idiom largo que ocupa dos líneas sigue
// cayendo sobre las reglas, como escrito a mano, y la hoja sigue rayada debajo de la
// última palabra hasta el final.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATEGORIAS, colores, espacio, fuentes } from '@/theme';
import type { Categoria, Palabra } from '@/types';

const LINEA = 36;
/** Dos líneas en blanco arriba, como el margen superior de una hoja. */
const MARGEN_ARRIBA = LINEA * 2;
const IZQ_TEXTO = 58;
const X_PUNTO = 32;
const PUNTO = 11;
const X_AGUJERO = 8;
const ALTO_AGUJERO = 14;
/** El texto baja un poco dentro de su línea para apoyarse en la regla y no flotar. */
const BAJA_TEXTO = 5;
/**
 * Dónde cae el centro visual del texto, desde arriba de su línea, para poner ahí el punto.
 * Medido con las métricas de Plus Jakarta Sans Bold a 17 px (ascendente 1,038 em,
 * descendente 0,222 em): Android centra esa caja en los 36 px de línea, así que la línea
 * base queda a 25 px, y el ojo centra un texto mezclado de mayúsculas y minúsculas unos
 * 0,3 em por encima de ella. Si cambia la fuente, el tamaño o `LINEA`, hay que recalcularlo.
 */
const CENTRO_TEXTO = BAJA_TEXTO + 20;
const ANCHO_PESTANA = 38;
const ASOMA_PESTANA = 8;

type Props = {
  palabras: Palabra[];
  categoria: Categoria;
  onCategoria: (c: Categoria) => void;
  onTocar: (p: Palabra) => void;
  onAnadir: () => void;
};

export function Libreta({ palabras, categoria, onCategoria, onTocar, onAnadir }: Props) {
  const [visible, setVisible] = useState(0);
  const [alto, setAlto] = useState(0);
  const lineas = Math.max(0, Math.floor((alto - MARGEN_ARRIBA) / LINEA));
  const titulo = CATEGORIAS.find((c) => c.id === categoria)?.titulo ?? '';

  return (
    <View style={s.fila}>
      <ScrollView
        style={s.hoja}
        onLayout={(e) => setVisible(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ minHeight: visible }} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: lineas }, (_, k) => {
              const arriba = MARGEN_ARRIBA + k * LINEA;
              const centro = arriba + CENTRO_TEXTO;
              return (
                <View key={k}>
                  <View style={[s.agujero, { top: centro - ALTO_AGUJERO / 2 }]} />
                  <View style={[s.punto, { top: centro - PUNTO / 2 }]} />
                  <View style={[s.regla, { top: arriba + LINEA - 1 }]} />
                </View>
              );
            })}
          </View>

          <View style={s.contenido}>
            {palabras.length === 0 ? (
              <Pressable onPress={onAnadir} style={s.renglon}>
                <Text style={[s.texto, s.vacio]}>
                  No {titulo.toLowerCase()} yet. <Text style={s.enlace}>Add one</Text>
                </Text>
              </Pressable>
            ) : (
              palabras.map((p) => (
                <Pressable key={p.id} onPress={() => onTocar(p)} style={s.renglon}>
                  <Text style={s.texto}>
                    <Text style={s.ingles}>{p.ingles}</Text> <Text style={s.espanol}>{p.espanol}</Text>
                    {p.pronunciacion ? <Text style={s.pron}> /{p.pronunciacion}/</Text> : null}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View style={s.pestanas}>
        {CATEGORIAS.map((c, i) => {
          const elegida = c.id === categoria;
          return (
            <Pressable
              key={c.id}
              onPress={() => onCategoria(c.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: elegida }}
              style={[
                s.pestana,
                { backgroundColor: c.color, width: ANCHO_PESTANA + (elegida ? ASOMA_PESTANA : 0) },
                i === 0 && s.primera,
                i === CATEGORIAS.length - 1 && s.ultima,
              ]}
            >
              {/* El texto girado: una caja tan ancha como alta es la pestaña, girada 90°. */}
              <View style={s.giro}>
                <Text numberOfLines={1} style={[s.titulo, !elegida && s.tituloApagado]}>
                  {c.titulo}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flex: 1, flexDirection: 'row', paddingLeft: espacio.md, paddingRight: espacio.sm },
  hoja: { flex: 1, backgroundColor: colores.hoja },
  contenido: { paddingTop: MARGEN_ARRIBA, paddingBottom: LINEA * 2 },
  renglon: { paddingLeft: IZQ_TEXTO, paddingRight: espacio.md },
  texto: {
    fontFamily: fuentes.negrita,
    fontSize: 17,
    lineHeight: LINEA,
    transform: [{ translateY: BAJA_TEXTO }],
  },
  ingles: { color: colores.tinta },
  espanol: { color: colores.rojo, fontFamily: fuentes.cursiva },
  pron: { color: colores.azul },
  vacio: { color: colores.tintaSuave, fontFamily: fuentes.medio },
  enlace: { color: colores.tinta, fontFamily: fuentes.negrita, textDecorationLine: 'underline' },
  regla: { position: 'absolute', left: IZQ_TEXTO - 6, right: espacio.md, height: 2, backgroundColor: colores.azul },
  punto: {
    position: 'absolute',
    left: X_PUNTO - PUNTO / 2,
    width: PUNTO,
    height: PUNTO,
    borderRadius: PUNTO / 2,
    backgroundColor: colores.azul,
  },
  agujero: {
    position: 'absolute',
    left: X_AGUJERO,
    width: 9,
    height: ALTO_AGUJERO,
    borderRadius: 5,
    backgroundColor: colores.fondo,
  },
  pestanas: { width: ANCHO_PESTANA + ASOMA_PESTANA, paddingVertical: 0 },
  pestana: { flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  primera: { borderTopRightRadius: 16 },
  ultima: { borderBottomRightRadius: 16 },
  // 160 de ancho cabe "Adjectives" de sobra; al girar, lo que manda es el alto de la pestaña.
  giro: { width: 160, alignItems: 'center', transform: [{ rotate: '90deg' }] },
  titulo: { fontFamily: fuentes.negrita, fontSize: 15, color: colores.tinta },
  tituloApagado: { fontFamily: fuentes.medio, opacity: 0.6 },
});
