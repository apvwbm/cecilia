// Backup: guardar o restaurar la copia cifrada con contraseña (la de Catffeine).
// La contraseña no se guarda en ningún sitio: se escribe cada vez.

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Boton, Cabecera, EspacioTeclado, estilos, Pulsable } from '@/components/ui';
import { ErrorCopia, exportarCopia, importarCopia } from '@/lib/copias';
import { fechaCorta } from '@/lib/fechas';
import { apuntarCopia, avisar, recargar, useApp } from '@/store/app';
import { colores, espacio, fuentes, radio, typo } from '@/theme';

const LONGITUD_MINIMA = 6;

const MENSAJES: Record<ErrorCopia['motivo'], string> = {
  'sin-cifrado': 'Backups only work in the installed app.',
  contrasena: 'Wrong password, or that file is not a Cecilia backup.',
  futura: 'This backup comes from a newer Cecilia. Update the app first.',
};

export default function Copia() {
  const ultimaCopia = useApp((x) => x.ultimaCopia);
  const [guardando, setGuardando] = useState(true);
  const [contrasena, setContrasena] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const fallo = (e: unknown) => setError(e instanceof ErrorCopia ? MENSAJES[e.motivo] : String(e));

  const cambiarModo = (guardar: boolean) => {
    setGuardando(guardar);
    setRepetida('');
    setError(null);
  };

  const guardar = async () => {
    if (contrasena.length < LONGITUD_MINIMA) return setError(`At least ${LONGITUD_MINIMA} characters.`);
    if (contrasena !== repetida) return setError('The passwords do not match.');
    setOcupado(true);
    try {
      await exportarCopia(contrasena);
      apuntarCopia();
      avisar('Backup saved');
      router.back();
    } catch (e) {
      fallo(e);
    } finally {
      setOcupado(false);
    }
  };

  const restaurar = () => {
    if (!contrasena) return setError('Type the password of the backup.');
    Alert.alert('Restore backup', 'This replaces everything on this phone with the backup.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          setOcupado(true);
          try {
            if (await importarCopia(contrasena)) {
              recargar();
              avisar('Backup restored');
              router.back();
            }
          } catch (e) {
            fallo(e);
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  };

  const campo = (valor: string, cambiar: (v: string) => void, placeholder: string) => (
    <TextInput
      value={valor}
      onChangeText={(v) => {
        cambiar(v);
        setError(null);
      }}
      placeholder={placeholder}
      placeholderTextColor={colores.tintaSuave}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      style={[typo.texto, s.campo]}
    />
  );

  return (
    <View style={estilos.pantalla}>
      <Cabecera titulo="Backup" />
      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[typo.texto, s.tinta]}>
          Your words live only on this phone. Save an encrypted copy somewhere safe (Drive, email…) so you never
          lose them.
        </Text>
        <Text style={[typo.apoyo, s.apagado]}>
          Last backup: {ultimaCopia ? fechaCorta(ultimaCopia) : 'never'}
        </Text>

        <View style={s.selector}>
          {[true, false].map((g) => (
            <Pulsable
              key={String(g)}
              onPress={() => cambiarModo(g)}
              style={[s.opcion, guardando === g && s.opcionElegida]}
              accessibilityLabel={g ? 'Save a backup' : 'Restore a backup'}
            >
              <Text style={[typo.pildora, s.tinta, guardando !== g && s.opcionApagada]}>{g ? 'Save' : 'Restore'}</Text>
            </Pulsable>
          ))}
        </View>

        <View style={s.formulario}>
          {!guardando && (
            <Text style={[typo.apoyo, s.apagado]}>
              Restoring replaces everything on this phone with the backup.
            </Text>
          )}
          {campo(contrasena, setContrasena, 'Password')}
          {guardando && campo(repetida, setRepetida, 'Repeat the password')}
          {guardando && (
            <Text style={[typo.apoyo, s.apagado]}>Write it down: without it, the backup cannot be opened.</Text>
          )}
          {error && <Text style={[typo.apoyo, s.error]}>{error}</Text>}
        </View>

        <Boton
          texto={guardando ? 'Save backup' : 'Choose backup file'}
          onPress={guardando ? guardar : restaurar}
          deshabilitado={ocupado}
        />
        <EspacioTeclado />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  contenido: { padding: espacio.pantalla, gap: espacio.lg },
  tinta: { color: colores.tinta },
  apagado: { color: colores.tintaSuave },
  error: { color: colores.rojo },
  selector: {
    flexDirection: 'row',
    backgroundColor: colores.hoja,
    borderRadius: radio.pill,
    padding: espacio.xs,
    marginTop: espacio.sm,
  },
  opcion: { flex: 1, height: 44, borderRadius: radio.pill, alignItems: 'center', justifyContent: 'center' },
  opcionElegida: { backgroundColor: colores.fondo },
  opcionApagada: { fontFamily: fuentes.medio, opacity: 0.6 },
  formulario: { gap: espacio.md },
  campo: {
    backgroundColor: colores.hoja,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
    color: colores.tinta,
  },
});
