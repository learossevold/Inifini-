import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Palette matches the Inifini landing page: deep navy, signal blue, gold.
      colors: {
        paper: '#FCFCFD',
        ink: '#14152D', // navy-black — body text + primary buttons
        muted: '#676B78',
        rule: '#ECEBF0',
        accent: '#2C3E9E', // signal blue — breaking + active states only
        accentSoft: '#E8EAF7',
        navy: '#13142B', // brand badge / dark surfaces
        gold: '#D6A84A', // reserved highlight (badges, "coming soon" style marks)
        goldSoft: '#FAF3E4',
        night: '#0B0C1D', // full-screen video / watch background
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        fadeUp: 'fadeUp 0.35s ease-out both',
        // Four Ken Burns moves, chosen per story so consecutive cards don't
        // drift identically. They alternate forever rather than settling, so a
        // card left on screen keeps moving like footage instead of freezing.
        kenburns1: 'kenburns1 24s ease-in-out infinite alternate',
        kenburns2: 'kenburns2 26s ease-in-out infinite alternate',
        kenburns3: 'kenburns3 28s ease-in-out infinite alternate',
        kenburns4: 'kenburns4 22s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        kenburns1: { from: { transform: 'scale(1.04) translate(0, 0)' }, to: { transform: 'scale(1.18) translate(-3%, -3%)' } },
        kenburns2: { from: { transform: 'scale(1.18) translate(2%, 2%)' }, to: { transform: 'scale(1.04) translate(0, 0)' } },
        kenburns3: { from: { transform: 'scale(1.08) translate(-3%, 1%)' }, to: { transform: 'scale(1.16) translate(3%, -2%)' } },
        kenburns4: { from: { transform: 'scale(1.06) translate(0, 3%)' }, to: { transform: 'scale(1.2) translate(0, -3%)' } },
      },
    },
  },
  plugins: [],
};
export default config;
