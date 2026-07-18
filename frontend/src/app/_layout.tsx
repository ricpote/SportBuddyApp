import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Archivo_700Bold, Archivo_900Black } from '@expo-google-fonts/archivo';
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
import { Platform, View, useWindowDimensions } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ChatBadgeProvider } from '@/contexts/chat-badge-context';
import { PendingWaitlistProvider } from '@/contexts/pending-waitlist-context';
import { WebSidebar } from '@/components/web-sidebar';

// 1. Criamos o nosso tema personalizado "Dark Premium"
const SportBuddyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#e8823f',
    background: '#0a0a0b',
    card: '#0c0c0d',
    text: '#f4f2ef',
    border: 'rgba(255,255,255,0.06)',
    notification: '#eb8f84',
  },
};

function RootNavigator() {
  const { user, initializing, signingUp } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (initializing) {
    return null;
  }

  const authedUser = signingUp ? null : user;

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop && !!authedUser && <WebSidebar />}
      <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#0c0c0d' },
        headerTintColor: '#e8823f', // Cor da seta de "voltar atrás"
        headerTitleStyle: { color: '#f4f2ef', fontWeight: 'bold' },
        headerShadowVisible: false, // Remove a linha feia por baixo do header
      }}
    >
      <Stack.Protected guard={!!authedUser}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="create-activity"
          options={{ headerShown: true, title: 'Nova atividade', presentation: 'modal' }}
        />
        <Stack.Screen name="activity/[id]" options={{ headerShown: true, title: 'Atividade' }} />
        <Stack.Screen
          name="edit-activity/[id]"
          options={{ headerShown: true, title: 'Editar atividade', presentation: 'modal' }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ headerShown: true, title: 'Editar perfil', presentation: 'modal' }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{ headerShown: true, title: 'Chat' }}
        />
        <Stack.Screen
          name="direct-chat/[id]"
          options={{ headerShown: true, title: 'Chat' }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{ headerShown: true, title: 'Perfil' }}
        />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: true, title: 'Notificações' }}
        />
        <Stack.Screen
          name="friends"
          options={{ headerShown: true, title: 'Amigos' }}
        />
        <Stack.Screen
          name="following"
          options={{ headerShown: true, title: 'A seguir' }}
        />
        <Stack.Screen
          name="followers/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="badges"
          options={{ headerShown: true, title: 'Badges', presentation: 'modal' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!authedUser}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_700Bold,
    Archivo_900Black,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={SportBuddyTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <PendingWaitlistProvider>
          <ChatBadgeProvider>
            <RootNavigator />
          </ChatBadgeProvider>
        </PendingWaitlistProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}