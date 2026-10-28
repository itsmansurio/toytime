import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, Calendar, Check, ChevronDown, ChevronRight, ChevronUp, CircleAlert, Clock, Command,
  Contact, CreditCard, House, Inbox, Info, Languages, Lock, MapPin, MessageCircle, MessageCircleMore, Monitor, Moon, PartyPopper,
  Plus, Search, Send, Settings, Share, ShieldCheck, Sparkles, SquarePen, Sun, Tag, Trash, UserPlus, Users, Wallet, X,
  type LucideProps,
} from 'lucide-react-native';
import { colors } from '../lib/theme';

// Иконки Lucide. Имена совместимы с прежними (Ionicons), чтобы не менять экраны.
const ICONS = {
  'add': Plus, 'alert': CircleAlert, 'alert-circle': CircleAlert, 'arrow-back': ArrowLeft, 'arrow-forward': ArrowRight,
  'arrow-up-right': ArrowUpRight, 'calendar-outline': Calendar, 'card': CreditCard, 'chatbubble-ellipses-outline': MessageCircleMore,
  'checkmark': Check, 'chevron-down': ChevronDown, 'chevron-forward': ChevronRight, 'chevron-up': ChevronUp, 'close': X,
  'command': Command, 'contact': Contact, 'create-outline': SquarePen, 'home': House, 'home-outline': House, 'inbox': Inbox,
  'information-circle-outline': Info, 'language-outline': Languages, 'location-outline': MapPin, 'lock-closed': Lock,
  'lock-closed-outline': Lock, 'logo-whatsapp': MessageCircle, 'monitor': Monitor, 'moon': Moon, 'notifications': Bell,
  'notifications-outline': Bell, 'party': PartyPopper, 'people': Users, 'people-outline': Users, 'pricetag-outline': Tag,
  'search': Search, 'send': Send, 'settings': Settings, 'settings-outline': Settings, 'share-outline': Share,
  'shield-checkmark-outline': ShieldCheck, 'sparkles': Sparkles, 'sun': Sun, 'time': Clock, 'time-outline': Clock,
  'trash-outline': Trash, 'user-plus': UserPlus, 'wallet': Wallet,
} satisfies Record<string, ComponentType<LucideProps>>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color, strokeWidth = 2, style }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number; style?: StyleProp<ViewStyle>;
}) {
  const C = ICONS[name];
  return <C size={size} color={color ?? colors.text} strokeWidth={strokeWidth} style={style} />;
}
