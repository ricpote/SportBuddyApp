import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

// TODO: atualiza este link sempre que gerares uma build nova no EAS
// (o link aparece no terminal/dashboard depois de "eas build --platform android --profile preview")
const APK_DOWNLOAD_URL = 'https://expo.dev/accounts/SEU_UTILIZADOR/projects/frontend/builds';

export function DownloadAppScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/sportbuddyIcon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>SportBuddy</Text>
      <Text style={styles.subtitle}>
        A versão web ainda não está otimizada para telemóvel.{'\n'}Descarrega a app para a melhor experiência.
      </Text>
      <Pressable style={styles.button} onPress={() => Linking.openURL(APK_DOWNLOAD_URL)}>
        <Text style={styles.buttonText}>Descarregar a app</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  title: {
    color: '#f4f2ef',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#c9c5bf',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#e8823f',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonText: {
    color: '#0a0a0b',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
