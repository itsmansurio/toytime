import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { SessionProvider, useSession } from '../lib/session';
import { colors, font } from '../lib/theme';

function RootStack() {
  const { ready, signedIn } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.green,
        headerTitleStyle: { color: colors.text, fontFamily: font.bold, fontSize: 17 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
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
        <Stack.Screen name="event/[id]/index" options={{ title: '', headerTransparent: true, headerTintColor: '#fff' }} />
        <Stack.Screen name="event/[id]/guests" options={{ title: 'Гости' }} />
        <Stack.Screen name="event/[id]/contacts" options={{ title: 'Выбор гостей' }} />
        <Stack.Screen name="event/[id]/manual" options={{ title: 'Новый гость', presentation: 'modal' }} />
        <Stack.Screen name="event/[id]/pay" options={{ title: 'Оплата' }} />
        <Stack.Screen name="event/[id]/done" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootStack />
    </SessionProvider>
  );
}
