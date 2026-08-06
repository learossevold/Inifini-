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
        // Long and linear on purpose: a drift you can catch happening is a
        // distraction, and ease-in-out makes it visibly surge in the middle.
        kenburns1: 'kenburns1 44s linear infinite alternate',
        kenburns2: 'kenburns2 48s linear infinite alternate',
        kenburns3: 'kenburns3 52s linear infinite alternate',
        kenburns4: 'kenburns4 40s linear infinite alternate',
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        // Held well above 1 throughout, so the subject fills the frame like a
        // shot rather than sitting inside the whole photo. Widened from
        // about a tenth of the frame to about a sixth — enough to actually
        // read as a deliberate push in, not just a breathing wobble — while
        // the duration (see the animation block above) stays untouched, so
        // it's still a slow, uncatchable drift rather than a visible zoom.
        kenburns1: { from: { transform: 'scale(1.16) translate(0, 0)' }, to: { transform: 'scale(1.32) translate(-2%, -2%)' } },
        kenburns2: { from: { transform: 'scale(1.32) translate(1.5%, 1.5%)' }, to: { transform: 'scale(1.16) translate(0, 0)' } },
        kenburns3: { from: { transform: 'scale(1.18) translate(-2%, 1%)' }, to: { transform: 'scale(1.34) translate(2%, -1.5%)' } },
        kenburns4: { from: { transform: 'scale(1.17) translate(0, 2%)' }, to: { transform: 'scale(1.33) translate(0, -2%)' } },
      },
    },
  },
  plugins: [],
};
export default config;
