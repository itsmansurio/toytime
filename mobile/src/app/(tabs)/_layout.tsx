import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../lib/theme';

const icon = (emoji: string) => ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.green, headerTitleStyle: { fontWeight: '700' }, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Мои мероприятия', tabBarLabel: 'Мероприятия', tabBarIcon: icon('📅') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Уведомления', tabBarIcon: icon('🔔') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
