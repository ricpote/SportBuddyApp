import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { PendingWaitlistProvider } from '@/contexts/pending-waitlist-context';

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <PendingWaitlistProvider>
          <RootNavigator />
        </PendingWaitlistProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
