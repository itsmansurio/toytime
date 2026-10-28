import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, font } from '../../lib/theme';

type Name = ComponentProps<typeof Ionicons>['name'];
const icon = (on: Name, off: Name) => ({ focused, color }: { focused: boolean; color: import('react-native').ColorValue }) =>
  <Ionicons name={focused ? on : off} size={21} color={color as string} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: '#78857D',
        tabBarActiveBackgroundColor: colors.greenLight,
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 10 },
        tabBarItemStyle: { borderRadius: 11, marginHorizontal: 4, marginVertical: 6, paddingVertical: 4 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: '#FFFFFFF2', height: 70, paddingHorizontal: 8 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Уведомления', tabBarIcon: icon('notifications', 'notifications-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
