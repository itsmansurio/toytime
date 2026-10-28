import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, font, shadow } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';
import { Icon, type IconName } from '../../components/Icon';

type IconProps = { focused: boolean; color: import('react-native').ColorValue };
const icon = (name: IconName) => ({ focused, color }: IconProps) => <Icon name={name} size={20} color={color as string} strokeWidth={focused ? 2.5 : 2} />;
const tenge = ({ color }: IconProps) => <Text style={{ color: color as string, fontSize: 19, fontFamily: font.bold, lineHeight: 22 }}>₸</Text>;

// Скрытые из нижнего меню экраны: открываются кнопками, меню остаётся видимым.
const HIDDEN = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } };

// Четыре вкладки, как в макете заказчика: Главная, Мероприятие, Гости, Оплата.
// «Приглашение гостям», уведомления и настройки открываются без своей вкладки.
export default function TabsLayout() {
  useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.greenLight,
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 10 },
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: 3, marginVertical: 8, paddingVertical: 3 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.tabBar, height: 72, paddingHorizontal: 8, ...shadow },
        sceneStyle: { backgroundColor: colors.bg },
        animation: 'shift',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="event" options={{ title: 'Мероприятие', tabBarIcon: icon('add') }} />
      <Tabs.Screen name="guests" options={{ title: 'Гости', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="payment" options={{ title: 'Оплата', tabBarIcon: tenge }} />
      <Tabs.Screen name="send" options={HIDDEN} />
      <Tabs.Screen name="notifications" options={HIDDEN} />
      <Tabs.Screen name="settings" options={HIDDEN} />
    </Tabs>
  );
}
