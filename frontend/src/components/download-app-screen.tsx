import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

const APK_DOWNLOAD_URL = 'https://expo.dev/accounts/pedrop0s-team/projects/frontend/builds/e4a21775-a21d-4c84-96e7-848f3b34e934';

export function DownloadAppScreen() {
  return (
    <View style={styles.container}>
      <View style={[styles.glowOuter, { filter: 'blur(60px)' } as any]} />
      <View style={[styles.glowMid, { filter: 'blur(50px)' } as any]} />
      <View style={[styles.glowInner, { filter: 'blur(40px)' } as any]} />
      <Image source={require('../../assets/images/sportbuddyIcon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>SportBuddy</Text>
      <Text style={styles.subtitle}>
        Bem-vindo! Encontra companheiros de jogo perto de ti e organiza a tua próxima atividade.
      </Text>
      <View style={styles.bullets}>
        <View style={styles.bulletRow}><View style={styles.dot} /><Text style={styles.bulletText}>Descobre atividades desportivas na tua zona</Text></View>
        <View style={styles.bulletRow}><View style={styles.dot} /><Text style={styles.bulletText}>Cria os teus próprios jogos e convida amigos</Text></View>
        <View style={styles.bulletRow}><View style={styles.dot} /><Text style={styles.bulletText}>Conversa com a equipa antes de jogar</Text></View>
      </View>
      <Pressable style={styles.button} onPress={() => Linking.openURL(APK_DOWNLOAD_URL)}>
        <Text style={styles.buttonText}>Descarregar a app</Text>
      </Pressable>
      <Text style={styles.footnote}>Grátis · Android</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  glowOuter: { position: 'absolute', top: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#e8823f', opacity: 0.05, alignSelf: 'center' },
  glowMid: { position: 'absolute', top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#e8823f', opacity: 0.08, alignSelf: 'center' },
  glowInner: { position: 'absolute', top: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: '#e8823f', opacity: 0.14, alignSelf: 'center' },
  logo: { width: 112, height: 112, borderRadius: 56, marginBottom: 8 },
  title: { color: '#f4f2ef', fontSize: 28, fontFamily: 'Archivo_900Black' },
  subtitle: { color: '#c9c5bf', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  bullets: { gap: 10, marginTop: 4, alignSelf: 'stretch', maxWidth: 300 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e8823f' },
  bulletText: { color: '#f4f2ef', fontSize: 14 },
  button: { marginTop: 8, backgroundColor: '#e8823f', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  buttonText: { color: '#0a0a0b', fontSize: 16, fontFamily: 'HankenGrotesk_700Bold' },
  footnote: { color: '#6b6862', fontSize: 13 },
});