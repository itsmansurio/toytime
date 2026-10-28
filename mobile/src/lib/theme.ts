export const colors = {
  green: '#0F5C3A',
  greenDark: '#0A3F28',
  greenMid: '#1E7A50',
  greenLight: '#E7F2EB',
  greenSoft: '#F1F7F3',
  gold: '#C9A24B',
  goldLight: '#F7EED8',
  bg: '#F5F7F5',
  card: '#FFFFFF',
  text: '#16231D',
  textSoft: '#3B4A43',
  muted: '#7A8A82',
  border: '#E3E9E5',
  red: '#C2412D',
  redLight: '#FBEAE6',
  amber: '#B7791F',
  amberLight: '#FDF3E1',
  grey: '#8A9690',
  greyLight: '#EEF1EF',
};

export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };

export const shadow = {
  shadowColor: '#0B2E1E',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// Цвет аватара по имени гостя, чтобы список не был однотонным.
const AVATAR = [
  ['#E7F2EB', '#0F5C3A'], ['#F7EED8', '#8A6A1F'], ['#E6EEF8', '#2D5A8C'],
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
