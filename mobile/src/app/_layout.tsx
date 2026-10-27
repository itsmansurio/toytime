import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../lib/session';
import { colors } from '../lib/theme';

function RootStack() {
  const { ready, signedIn } = useSession();
  if (!ready) return null;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.green,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerBackTitle: 'Назад',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/new" options={{ title: 'Новое мероприятие' }} />
        <Stack.Screen name="event/[id]/index" options={{ title: 'Мероприятие' }} />
        <Stack.Screen name="event/[id]/guests" options={{ title: 'Гости' }} />
        <Stack.Screen name="event/[id]/contacts" options={{ title: 'Выбор гостей' }} />
        <Stack.Screen name="event/[id]/manual" options={{ title: 'Добавить вручную', presentation: 'modal' }} />
        <Stack.Screen name="event/[id]/pay" options={{ title: 'Оплата' }} />
        <Stack.Screen name="event/[id]/done" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootStack />
    </SessionProvider>
  );
}
