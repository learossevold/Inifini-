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
        swipeHint: 'swipeHint 2s ease-in-out infinite',
        // Four Ken Burns moves, chosen per story so consecutive cards don't
        // drift identically. They alternate forever rather than settling, so a
        // card left on screen keeps moving like footage instead of freezing.
        //
        // Roughly halved from the original 40–52s. At those durations the move
        // was real but arithmetically invisible: about 0.35% of scale per
        // second, well under what the eye registers as motion on a photo it is
        // looking at for a few seconds at a time. Watch is the tab you choose
        // when you'd rather *see* the news than read it, so the push-in has to
        // actually read as a camera move within the seconds a card is on
        // screen — not only over a minute of staring. Still linear: a drift you
        // can catch starting is a distraction, and ease-in-out makes it
        // visibly surge in the middle.
        kenburns1: 'kenburns1 22s linear infinite alternate',
        kenburns2: 'kenburns2 24s linear infinite alternate',
        kenburns3: 'kenburns3 26s linear infinite alternate',
        kenburns4: 'kenburns4 20s linear infinite alternate',
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        swipeHint: { '0%,100%': { opacity: '0.45', transform: 'translateY(3px)' }, '50%': { opacity: '1', transform: 'translateY(-3px)' } },
        // Held well above 1 throughout, so the subject fills the frame like a
        // shot rather than sitting inside the whole photo. The travel is now
        // about a third of the frame, up from a sixth: combined with the
        // halved durations above, that turns what was a barely-measurable
        // drift into a push-in you can see happening while you read the
        // caption. The pans grew with it — a move that only scales, with no
        // lateral travel, reads as a lens zoom rather than a camera pushing
        // through the scene, which is the difference between "the picture got
        // bigger" and footage.
        kenburns1: { from: { transform: 'scale(1.12) translate(0, 0)' }, to: { transform: 'scale(1.46) translate(-4%, -3.5%)' } },
        kenburns2: { from: { transform: 'scale(1.46) translate(3%, 3%)' }, to: { transform: 'scale(1.12) translate(0, 0)' } },
        kenburns3: { from: { transform: 'scale(1.14) translate(-3.5%, 2%)' }, to: { transform: 'scale(1.48) translate(3.5%, -3%)' } },
        kenburns4: { from: { transform: 'scale(1.13) translate(0, 3.5%)' }, to: { transform: 'scale(1.47) translate(0, -3.5%)' } },
      },
    },
  },
  plugins: [],
};
export default config;
