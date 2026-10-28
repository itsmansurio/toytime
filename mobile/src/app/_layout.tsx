import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { SessionProvider, useSession } from '../lib/session';
import { CurrentEventProvider } from '../lib/current';
import { ToastProvider } from '../components/Toast';
import { colors, font } from '../lib/theme';

function RootStack() {
  const { ready, signedIn } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.green,
        headerTitleStyle: { color: colors.text, fontFamily: font.extrabold, fontSize: 18 },
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
        <Stack.Screen name="event/[id]/contacts" options={{ title: 'Гости из контактов', headerStyle: { backgroundColor: colors.green }, headerTintColor: '#fff', headerTitleStyle: { color: '#fff', fontFamily: font.extrabold, fontSize: 18 } }} />
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
      <CurrentEventProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootStack />
        </ToastProvider>
      </CurrentEventProvider>
    </SessionProvider>
  );
}
