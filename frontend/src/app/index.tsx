import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Text, View, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 1. Importar a biblioteca de ícones do Expo
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email === '' || password === '') {
      Alert.alert('Erro', 'Por favor, preenche todos os campos!');
      return;
    }
    Alert.alert('Sucesso', `Tentativa de login com: ${email}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Ícone gigante no topo para dar estilo */}
        <Image
          source={require('../../assets/images/sportbuddyIcon.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />

        <Text style={styles.title}>SportBuddy</Text>
        <Text style={styles.subtitle}>Faz o login para continuares</Text>

        {/* Input do Email COM ÍCONE */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="O teu email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Input da Password COM ÍCONE */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="A tua password"
            placeholderTextColor="#888"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Botão de Login com nova cor */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Mudei o fundo para um azul muito escuro
    backgroundColor: '#0B132B',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoIcon: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 320,   // Podes aumentar ou diminuir este valor se achares pequeno/grande
    height: 320,  // Mantém igual à largura para o logo não ficar deformado
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    // Mudei a cor principal para um vermelho/coral vibrante
    color: '#CF8444',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 40,
  },
  // O "truque" para colocar o ícone dentro da caixa de texto
  inputContainer: {
    flexDirection: 'row', // Coloca os elementos lado a lado
    alignItems: 'center', // Centra verticalmente
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#3A506B',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10, // Dá um espaço entre o ícone e o texto
  },
  input: {
    flex: 1, // Faz a caixa de texto ocupar o resto do espaço
    color: '#FFFFFF',
    paddingVertical: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#CF8444', // Mesma cor do título
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});