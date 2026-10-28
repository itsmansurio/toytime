// Две темы — светлая и тёмная — на основе макета заказчика (тёмно-зелёный + салатовый).
// Все пары «текст / фон» проверены на контраст WCAG AAA (не ниже 7:1).
const light = {
  bg: '#F5F7F4',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#17231F',
  textSoft: '#2F3B35',
  muted: '#4A5650',
  border: '#E2E8E3',
  inputBorder: '#CBD5CE',
  header: '#123C32',
  headerSub: '#D5E4DD',
  green: '#123C32',        // акцент: ссылки, иконки, активные элементы
  primary: '#123C32',      // фон основной кнопки
  onPrimary: '#FFFFFF',
  greenMid: '#1D6A54',
  greenLight: '#EAF2E9',
  greenSoft: '#EDF2EE',
  lime: '#D8F27B',
  onLime: '#123C32',
  gold: '#D8F27B',
  goldLight: '#F1F6E6',
  notice: '#3A4A22',
  red: '#8A2720',
  redLight: '#FFEBE8',
  amber: '#634408',
  amberLight: '#FFF3D8',
  yes: '#1A5230',
  yesLight: '#E3F5E8',
  grey: '#4A5650',
  greyLight: '#F5F7F4',
  skeleton: '#E6ECE7',
  overlay: 'rgba(12, 20, 17, 0.45)',
  tabBar: 'rgba(255, 255, 255, 0.96)',
};

const dark: typeof light = {
  bg: '#0C1411',
  card: '#141F1B',
  elevated: '#1A2723',
  text: '#F1F5F2',
  textSoft: '#D6E0DA',
  muted: '#B4C1BA',
  border: '#24332D',
  inputBorder: '#3A4D45',
  header: '#0F2A22',
  headerSub: '#C9D9D1',
  green: '#D8F27B',
  primary: '#D8F27B',
  onPrimary: '#10251D',
  greenMid: '#A9D46A',
  greenLight: '#1E2E28',
  greenSoft: '#1B2924',
  lime: '#D8F27B',
  onLime: '#123C32',
  gold: '#D8F27B',
  goldLight: '#1B2616',
  notice: '#DCEBB8',
  red: '#FFBDB5',
  redLight: '#3A1B18',
  amber: '#F5D58A',
  amberLight: '#33270F',
  yes: '#9BE8B3',
  yesLight: '#123020',
  grey: '#B4C1BA',
  greyLight: '#0C1411',
  skeleton: '#22302B',
  overlay: 'rgba(0, 0, 0, 0.6)',
  tabBar: 'rgba(20, 31, 27, 0.96)',
};

export type ThemeMode = 'light' | 'dark';
export const colors = { ...light };
export const shadow = {
  shadowColor: '#17231F',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

let version = 0;
export let themeMode: ThemeMode = 'light';

// Переключает палитру. Экраны перерисовываются через ThemeProvider.
export function applyTheme(mode: ThemeMode) {
  themeMode = mode;
  Object.assign(colors, mode === 'dark' ? dark : light);
  Object.assign(shadow, mode === 'dark' ? { shadowColor: '#000', shadowOpacity: 0.35 } : { shadowColor: '#17231F', shadowOpacity: 0.06 });
  version++;
}

// Стили, которые пересчитываются при смене темы: themed(() => StyleSheet.create({...})).
export function themed<T extends object>(factory: () => T): T {
  let built = -1;
  let cache = {} as T;
  return new Proxy({} as T, {
    get(_, key) {
      if (built !== version) { cache = factory(); built = version; }
      return cache[key as keyof T];
    },
  });
}

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

export const radius = { sm: 12, md: 14, lg: 20, xl: 24 };

// Цвет аватара по имени гостя.
export function avatarColors(_name: string) {
  return [colors.greenLight, colors.green];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => /[\p{L}]/u.test(p));
  if (!parts.length) return '#';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
