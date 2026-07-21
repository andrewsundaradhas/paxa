/**
 * paxa design tokens — premium payment-app skin (SplitR Premium.dc.html).
 *
 * Apple-grade restraint: a warm off-white canvas, dark "wallet" balance hero
 * cards, soft shadows + hairline borders (not bold outlines), Sora display
 * type over Inter body, and ONE electric lime accent reserved for primary
 * money-moving CTAs. The bright sticker colours survive only as avatar/accent
 * fills and their soft pastel "tints" used behind icons and group initials.
 */

export const colors = {
  /** Warm near-black — text, dark hero cards, the brand ink. */
  ink: '#16150f',
  white: '#ffffff',
  /** App canvas. */
  canvas: '#f4f2ec',
  /** THE accent — primary CTAs (Settle / Pay / Add) and on-dark highlights. */
  lime: '#c2f23f',
  /** Deep lime-green for positive amounts + small icons on light surfaces. */
  limeDark: '#3f6b00',

  /** Muted text ramp. */
  muted: '#8a887d',
  muted2: '#a3a196',
  muted3: '#6f6d63',

  /** Hairline border + soft separators. */
  line: 'rgba(20,20,15,0.06)',

  /** Avatar / accent fills. */
  pink: '#fa00ff',
  cyan: '#02bbff',
  khaki: '#e7e3bf',

  /** Segmented-control track. */
  track: '#e7e4db',
} as const;

/** Soft pastel tint behind an accent fill (group initials, expense icons). */
export const TINT: Record<string, string> = {
  '#fa00ff': '#f6e6f3',
  '#02bbff': '#e3eef5',
  '#c2f23f': '#edf7cf',
  '#adff02': '#edf7cf',
  '#e7e3bf': '#f0ecdd',
};

/** Category → pastel tint. */
export const CATTINT: Record<string, string> = {
  Food: '#edf7cf',
  Travel: '#e3eef5',
  Stay: '#f0ecdd',
  Fun: '#f6e6f3',
  Rent: '#e3eef5',
  Bills: '#f0ecdd',
};

export const tintOf = (fill: string): string => TINT[fill] || '#f0ecdd';

/** Radii: soft and generous in the premium skin. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 22,
  card: 22,
  hero: 28,
  sheet: 36,
  pill: 999,
} as const;

/**
 * Fonts. Space Grotesk (display) + Hanken Grotesk (body), bundled as native
 * assets via react-native.config.js. If missing at runtime, RN falls back to
 * the system font — layout is unaffected.
 */
export const fonts = {
  display: 'SpaceGrotesk-Bold', // big numbers, headlines, the wordmark
  displaySemi: 'SpaceGrotesk-SemiBold',
  body: 'HankenGrotesk-Regular',
  bodyMedium: 'HankenGrotesk-Medium',
  bodyBold: 'HankenGrotesk-Bold',
} as const;

/** Standard hairline used on soft cards/inputs (replaces the bold black border). */
export const hairline = {
  borderWidth: 1,
  borderColor: colors.line,
} as const;

/** Soft elevation used across light cards (premium has shadows, sparingly). */
export const softShadow = {
  shadowColor: '#14140f',
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: {width: 0, height: 6},
  elevation: 2,
} as const;
