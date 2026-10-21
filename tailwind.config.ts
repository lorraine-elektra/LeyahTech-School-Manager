import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: 'var(--accent)', dark: 'var(--accent-dark)', tint: 'var(--accent-tint)' },
        ink: { DEFAULT: '#1d1f21', muted: '#5b6066', faint: '#8a8f95' },
        line: { DEFAULT: '#dcdfe3', strong: '#c3c7cc' },
        surface: { DEFAULT: '#ffffff', muted: '#f5f6f7', sunken: '#eceef0' },
        good: '#2c6a3f',
        warn: '#8a5800',
        bad: '#a3271c',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '4px' },
    },
  },
  plugins: [],
} satisfies Config;
