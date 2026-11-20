// Add / Edit. Con `?id` edita esa palabra; con `?categoria` empieza con esa pestaña
// elegida (desde la libreta vacía).
//
// Al añadir, la pantalla NO se cierra: se vacían los campos, la categoría se queda y el
// foco vuelve a la primera línea, para meter diez verbos seguidos sin salir. El aviso de
// abajo dice qué ha entrado y deja deshacerlo.

import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Boton, Cabecera, EspacioTeclado, estilos, Mazo, Pulsable, useSacudida } from '@/components/ui';
import { limpiaPron, normaliza } from '@/lib/texto';
import { anadirPalabra, borrarPalabra, editarPalabra, useApp } from '@/store/app';
import { CATEGORIAS, colores, espacio, fuentes, typo } from '@/theme';
import type { Categoria } from '@/types';

export default function PantallaPalabra() {
  const params = useLocalSearchParams<{ id?: string; categoria?: Categoria }>();
  const palabras = useApp((x) => x.palabras);
  const editando = palabras.find((p) => p.id === params.id);

  const [ingles, setIngles] = useState(editando?.ingles ?? '');
  const [espanol, setEspanol] = useState(editando?.espanol ?? '');
  const [pron, setPron] = useState(editando?.pronunciacion ?? '');
  const [categoria, setCategoria] = useState<Categoria | null>(editando?.categoria ?? params.categoria ?? null);

  const refIngles = useRef<ComponentRef<typeof TextInput>>(null);
  const refEspanol = useRef<ComponentRef<typeof TextInput>>(null);
  const refPron = useRef<ComponentRef<typeof TextInput>>(null);
  const [sacudidaCarta, sacudirCarta] = useSacudida();
  const [sacudidaChips, sacudirChips] = useSacudida();

  // Se avisa, pero se deja guardar: "fine" puede ser adjetivo y sustantivo a la vez.
  const clave = normaliza(ingles);
  const repetida = clave.length > 0 && palabras.some((p) => p.id !== editando?.id && normaliza(p.ingles) === clave);

  const guardar = () => {
    const datos = { ingles: ingles.trim(), espanol: espanol.trim(), pronunciacion: limpiaPron(pron) };
    if (!datos.ingles || !datos.espanol) {
      sacudirCarta();
      (datos.ingles ? refEspanol : refIngles).current?.focus();
      return;
    }
    if (!categoria) {
      sacudirChips();
      return;
    }
    if (editando) {
      editarPalabra(editando.id, { ...datos, categoria: categoria });
      router.back();
      return;
    }
    anadirPalabra({ ...datos, categoria: categoria });
    setIngles('');
    setEspanol('');
    setPron('');
    refIngles.current?.focus();
  };

  const borrar = () => {
    if (!editando) return;
    borrarPalabra(editando.id);
    router.back();
  };

  return (
    <View style={estilos.pantalla}>
      <Cabecera titulo={editando ? 'Edit' : 'Add'} />
      <ScrollView
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={sacudidaCarta}>
          <Mazo>
            <View style={[estilos.carta, s.carta]}>
              <TextInput
                ref={refIngles}
                value={ingles}
                onChangeText={setIngles}
                placeholder="Your word"
                placeholderTextColor={colores.tintaSuave}
                style={[s.campo, typo.palabra, { color: colores.tinta }]}
                autoFocus={!editando}
                autoCapitalize="none"
                multiline
                submitBehavior="submit"
                returnKeyType="next"
                onSubmitEditing={() => refEspanol.current?.focus()}
              />
              <TextInput
                ref={refEspanol}
                value={espanol}
                onChangeText={setEspanol}
                placeholder="Traducción"
                placeholderTextColor={colores.rojoSuave}
                style={[s.campo, typo.traduccion, { color: colores.rojo }]}
                autoCapitalize="none"
                multiline
                submitBehavior="submit"
                returnKeyType="next"
                onSubmitEditing={() => refPron.current?.focus()}
              />
              {/* Las barras van fuera del campo: dentro, el cursor se metería entre ellas. */}
              <View style={s.filaPron}>
                <Text style={[typo.pron, s.barra, { color: pron ? colores.azul : colores.azulSuave }]}>/</Text>
                <TextInput
                  ref={refPron}
                  value={pron}
                  onChangeText={setPron}
                  placeholder="pronunciación"
                  placeholderTextColor={colores.azulSuave}
                  style={[s.campoPron, typo.pron, { color: colores.azul }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={guardar}
                />
                <Text style={[typo.pron, s.barra, { color: pron ? colores.azul : colores.azulSuave }]}>/</Text>
              </View>
            </View>
          </Mazo>
        </Animated.View>

        {repetida && <Text style={[typo.apoyo, s.repetida]}>Already in your list</Text>}

        <Animated.View style={[s.chips, sacudidaChips]}>
          {CATEGORIAS.map((c) => {
            const elegida = c.id === categoria;
            return (
              <Pulsable
                key={c.id}
                onPress={() => setCategoria(c.id)}
                style={[s.chip, { backgroundColor: c.color }, elegida && s.chipElegido]}
                accessibilityLabel={c.titulo}
              >
                <Text style={[typo.pildora, { color: colores.tinta }, !elegida && s.chipApagado]}>{c.titulo}</Text>
              </Pulsable>
            );
          })}
        </Animated.View>

        <View style={s.acciones}>
          {editando && (
            <Pulsable onPress={borrar} style={s.papelera} accessibilityLabel="Delete">
              <Feather name="trash-2" size={22} color={colores.rojo} />
            </Pulsable>
          )}
          <Boton texto={editando ? 'Save' : 'Add'} onPress={guardar} style={s.guardar} />
        </View>

        <EspacioTeclado />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  contenido: { padding: espacio.pantalla, paddingTop: espacio.xl, gap: espacio.xl },
  carta: { paddingHorizontal: espacio.xl, paddingVertical: espacio.xxl, gap: espacio.md, minHeight: 260, justifyContent: 'center' },
  campo: { textAlign: 'center', padding: 0 },
  filaPron: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  campoPron: { padding: 0, minWidth: 12, flexShrink: 1 },
  barra: { paddingHorizontal: 2 },
  repetida: { color: colores.rojo, textAlign: 'center', marginTop: -espacio.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: espacio.md },
  chip: {
    paddingHorizontal: espacio.lg + espacio.xs,
    paddingVertical: espacio.md + 2,
    // Rectos, como en el diseño: son las mismas pestañas de la libreta, sueltas.
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  chipElegido: { borderColor: colores.tinta },
  chipApagado: { fontFamily: fuentes.medio, opacity: 0.75 },
  acciones: { flexDirection: 'row', gap: espacio.md, marginTop: espacio.sm },
  papelera: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colores.hoja,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardar: { flex: 1 },
});
