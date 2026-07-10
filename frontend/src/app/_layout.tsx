import { DarkTheme, Stack, ThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ChatBadgeProvider } from '@/contexts/chat-badge-context';
import { PendingWaitlistProvider } from '@/contexts/pending-waitlist-context';

// 1. Criamos o nosso tema personalizado "Dark Premium"
const SportBuddyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#CF8444',       // Laranja da app (botões nativos e setas)
    background: '#0F172A',    // Fundo principal de todos os ecrãs
    card: '#1E293B',          // Fundo das barras (headers e bottom tabs)
    text: '#FFFFFF',          // Texto principal
    border: '#334155',        // Linhas de separação nativas
    notification: '#FF6B6B',  // Cor das bolinhas de notificação
  },
};

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  return (
    <Stack 
      // 2. Aplicamos estilos globais aos cabeçalhos de navegação
      screenOptions={{ 
        headerShown: false,
        headerStyle: { backgroundColor: '#1E293B' },
        headerTintColor: '#CF8444', // Cor da seta de "voltar atrás"
        headerTitleStyle: { color: '#FFFFFF', fontWeight: 'bold' },
        headerShadowVisible: false, // Remove a linha feia por baixo do header
      }}
    >
      <Stack.Protected guard={!!user}>
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
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // 3. Forçamos o nosso tema para a app nunca ficar branca de repente
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