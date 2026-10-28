import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, font } from '../../lib/theme';

type Name = ComponentProps<typeof Ionicons>['name'];
const icon = (on: Name, off: Name) => ({ focused, color }: { focused: boolean; color: import('react-native').ColorValue }) =>
  <Ionicons name={focused ? on : off} size={23} color={color as string} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: '#fff', height: 64, paddingTop: 6 },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: font.extrabold, fontSize: 22, color: colors.text },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Мои мероприятия', tabBarLabel: 'Мероприятия', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Уведомления', tabBarIcon: icon('notifications', 'notifications-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
