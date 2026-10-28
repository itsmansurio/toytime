import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';
import { colors, font } from '../../lib/theme';

type Name = ComponentProps<typeof Ionicons>['name'];
type IconProps = { focused: boolean; color: import('react-native').ColorValue };
const icon = (on: Name, off: Name) => ({ focused, color }: IconProps) => <Ionicons name={focused ? on : off} size={20} color={color as string} />;
const tenge = ({ color }: IconProps) => <Text style={{ color: color as string, fontSize: 19, fontFamily: font.bold, lineHeight: 22 }}>₸</Text>;

// Скрытые из нижнего меню экраны: открываются кнопками, меню остаётся видимым.
const HIDDEN = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } };

// Четыре вкладки, как в макете заказчика: Главная, Мероприятие, Гости, Оплата.
// «Приглашение гостям», уведомления и настройки открываются без своей вкладки.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: '#78857D',
        tabBarActiveBackgroundColor: colors.greenLight,
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 10 },
        tabBarItemStyle: { borderRadius: 11, marginHorizontal: 3, marginVertical: 8, paddingVertical: 3 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: '#FFFFFFF2', height: 72, paddingHorizontal: 8 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="event" options={{ title: 'Мероприятие', tabBarIcon: icon('add', 'add') }} />
      <Tabs.Screen name="guests" options={{ title: 'Гости', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="payment" options={{ title: 'Оплата', tabBarIcon: tenge }} />
      <Tabs.Screen name="send" options={HIDDEN} />
      <Tabs.Screen name="notifications" options={HIDDEN} />
      <Tabs.Screen name="settings" options={HIDDEN} />
    </Tabs>
  );
}
