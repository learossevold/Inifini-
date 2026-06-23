import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBFAF7',
        ink: '#16140F',
        muted: '#6B675D',
        rule: '#E6E2D8',
        accent: '#B23A28', // warm signal red — breaking + active states only
        accentSoft: '#F5E6E2',
        night: '#0E0D0B', // full-screen video / watch background
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        fadeUp: 'fadeUp 0.35s ease-out both',
        kenburns: 'kenburns 18s ease-out both',
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        kenburns: { from: { transform: 'scale(1) translate(0,0)' }, to: { transform: 'scale(1.12) translate(-2%,-2%)' } },
      },
    },
  },
  plugins: [],
};
export default config;
