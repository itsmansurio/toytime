// Палитра по макету заказчика: тёмно-зелёный + салатовый акцент.
export const colors = {
  green: '#123C32',
  greenDark: '#0C2B24',
  greenMid: '#1D6A54',
  greenLight: '#EAF2E9',
  greenSoft: '#EDF2EE',
  lime: '#D8F27B',
  gold: '#D8F27B',
  goldLight: '#F1F6E6',
  bg: '#F5F7F4',
  card: '#FFFFFF',
  text: '#17231F',
  textSoft: '#3E4C45',
  muted: '#738078',
  border: '#E5EAE5',
  red: '#B94B43',
  redLight: '#FFEBE8',
  amber: '#8B6316',
  amberLight: '#FFF3D8',
  yes: '#267143',
  yesLight: '#E3F5E8',
  grey: '#8A9690',
  greyLight: '#F5F7F4',
};

export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const radius = { sm: 11, md: 12, lg: 18, xl: 25 };

export const shadow = {
  shadowColor: '#17231F',
  shadowOpacity: 0.03,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 3 },
  elevation: 1,
};

// Цвет аватара по имени гостя, чтобы список не был однотонным.
const AVATAR = [
  ['#E9F1E8', '#123C32'], ['#F1F6E6', '#53663A'], ['#E6EEF8', '#2D5A8C'],
  ['#F6E7EE', '#8C2D5A'], ['#EDE8F7', '#4F3A8C'], ['#E3F3F3', '#1F6B6B'],
];
export function avatarColors(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => /[\p{L}]/u.test(p));
  if (!parts.length) return '#';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
