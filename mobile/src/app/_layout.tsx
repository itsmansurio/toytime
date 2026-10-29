import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { SessionProvider, useSession } from '../lib/session';
import { CurrentEventProvider } from '../lib/current';
import { ThemeProvider, useTheme } from '../lib/themeContext';
import { ToastProvider } from '../components/Toast';
import { CommandPaletteProvider } from '../components/CommandPalette';
import { colors, font } from '../lib/theme';
import { t } from '../lib/i18n';

function RootStack() {
  const { ready, signedIn } = useSession();
  useTheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.green,
        headerTitleStyle: { color: colors.text, fontFamily: font.extrabold, fontSize: 18 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerBackTitle: t('Назад'),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]/contacts" options={{ title: t('Гости из контактов'), headerStyle: { backgroundColor: colors.header }, headerTintColor: '#FFFFFF', headerTitleStyle: { color: '#FFFFFF', fontFamily: font.extrabold, fontSize: 18 } }} />
        <Stack.Screen name="event/[id]/done" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <ThemeProvider>
      <SessionProvider>
        <CurrentEventProvider>
          <ToastProvider>
            <CommandPaletteProvider>
              <StatusBar style="light" />
              <RootStack />
            </CommandPaletteProvider>
          </ToastProvider>
        </CurrentEventProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
