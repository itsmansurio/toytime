import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Push нужен, чтобы сообщать организатору об ответах гостей.
// Для Expo Push нужен projectId из EAS; без него приложение работает, а уведомления видны во вкладке.
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return null;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}
