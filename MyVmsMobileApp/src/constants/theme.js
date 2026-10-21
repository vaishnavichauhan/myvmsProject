/**
 * MYVMS Design System Tokens & Colors
 * Perfectly matches web frontend index.css
 */
export const THEME = {
  colors: {
    // Core Mandated Colors
    background: '#F5F0E6', // Sandy Beige — Main screen background
    clay: '#C49A6C',       // Clay Brown — Primary buttons & highlights
    clayDark: '#B08253',
    darkBrown: '#403630',  // Dark Brown — Text and headings
    text: '#403630',
    textMuted: '#6E5D53',
    textDim: '#8E7C70',
    skyBlue: '#87CEEB',    // Sky Blue — Links & interactive accents
    skyBlueDark: '#0284C7',
    fernGreen: '#6B8E5A',  // Fern Green — Secondary buttons & accents
    fernGreenDark: '#577747',
    sand: '#D6C2A1',       // Light Sand — Borders & card lines
    sandLight: 'rgba(214, 194, 161, 0.22)',
    sandWell: '#FAF5ED',
    white: '#FFFFFF',

    // Status Colors
    error: '#DC2626',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    errorBorder: 'rgba(239, 68, 68, 0.3)',
    warning: '#D97706',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.3)',
    success: '#6B8E5A',
    successBg: 'rgba(107, 142, 90, 0.12)',
    successBorder: 'rgba(107, 142, 90, 0.3)',
    info: '#0284C7',
    infoBg: 'rgba(135, 206, 235, 0.22)',
    infoBorder: 'rgba(135, 206, 235, 0.4)',
  },

  typography: {
    fontFamily: undefined, // Uses native system font (San Francisco on iOS, Roboto on Android)
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#403630',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    float: {
      shadowColor: '#403630',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    button: {
      shadowColor: '#C49A6C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};
