import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, themed } from '../lib/theme';
import { T } from './ui';

// Короткое сообщение снизу, как в макете («Мероприятие сохранено»).
const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: string) => {
    setText(t);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(), 2400);
  }, [opacity]);
  return (
    <ToastContext.Provider value={show}>
      <View style={{ flex: 1 }}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }]}>
          <T size={13} color={colors.bg} style={{ textAlign: 'center' }}>{text}</T>
        </Animated.View>
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = themed(() => StyleSheet.create({
  toast: { position: 'absolute', bottom: 96, alignSelf: 'center', maxWidth: '90%', backgroundColor: colors.text, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
}));
