import { DURATION, EASE } from './src/ui/motion.constants.ts';

const ms = (value) => `${value}ms`;
const bezier = ([x1, y1, x2, y2]) => `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
const durations = {
  fast: ms(DURATION.fast),
  base: ms(DURATION.base),
  slow: ms(DURATION.slow),
  data: ms(DURATION.data),
  expand: ms(DURATION.expand),
  collapse: ms(DURATION.collapse),
};
const easings = {
  'out-quint': bezier(EASE.outQuint),
  'out-settle': bezier(EASE.outSettle),
  expand: bezier(EASE.expand),
  collapse: bezier(EASE.collapse),
  'in-quint': bezier(EASE.inQuint),
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,css}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        positive: 'hsl(var(--positive))',
        negative: 'hsl(var(--negative))',
        warning: 'hsl(var(--warning))',
        elevated: 'hsl(var(--elevated))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
          6: 'hsl(var(--chart-6))',
          7: 'hsl(var(--chart-7))',
        },
      },
      transitionDuration: durations,
      animationDuration: durations,
      transitionTimingFunction: easings,
      animationTimingFunction: easings,
      keyframes: {
        // M04: entry only. The router has no exit phase, so the outgoing page is
        // replaced synchronously; see motion-system.md §5.6.
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(6px)' },
        },
        // M05 on Radix content, which measures itself into a CSS variable. The
        // outgoing frame never returns to the open state, so the exit is written
        // out in full; the entry can lean on the resting value.
        'accordion-down': {
          from: { height: '0', opacity: '0', transform: 'translateY(-4px)' },
          to: {
            height: 'var(--radix-accordion-content-height)',
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
            opacity: '1',
            transform: 'translateY(0)',
          },
          to: { height: '0', opacity: '0', transform: 'translateY(-2px)' },
        },
        // M05 on the hand-rolled disclosure, which stays mounted so it can
        // animate out. The resting value is `auto` (or `0` when closed) and
        // `interpolate-size: allow-keywords` makes that keyword interpolable, so
        // no JS measurement is involved. Both ends have to be written out: once
        // the state class flips, the resting height is already the target, so an
        // implicit endpoint would interpolate a value against itself.
        'disclosure-down': {
          from: { height: '0', opacity: '0', transform: 'translateY(-4px)' },
        },
        'disclosure-up': {
          from: { height: 'auto', opacity: '1', transform: 'translateY(0)' },
          to: { height: '0', opacity: '0', transform: 'translateY(-2px)' },
        },
        // M08: the series rises out of the baseline. One clip rect grows
        // vertically over the whole series group, so the line and its area stay
        // glued and the stroke width is never distorted by the scaling.
        'chart-reveal': {
          from: { transform: 'scaleY(0)' },
        },
      },
      animation: {
        // `backwards`, not `both`: a finished `both` animation keeps a
        // `transform` value, and any transform makes the container a containing
        // block for `fixed` descendants (the Dashboard grid lives there).
        'page-enter': `page-enter ${ms(DURATION.slow)} ${bezier(EASE.outSettle)} backwards`,
        'accordion-down': `accordion-down ${ms(DURATION.expand)} ${bezier(EASE.expand)}`,
        'accordion-up': `accordion-up ${ms(DURATION.collapse)} ${bezier(EASE.collapse)}`,
        'disclosure-down': `disclosure-down ${ms(DURATION.expand)} ${bezier(EASE.expand)}`,
        'disclosure-up': `disclosure-up ${ms(DURATION.collapse)} ${bezier(EASE.collapse)}`,
        // A reveal, not an arrival: `expand` is symmetric, so the growth stays
        // visible for the whole length and never overshoots the data.
        'chart-reveal': `chart-reveal ${ms(DURATION.slow)} ${bezier(EASE.expand)}`,
      },
      letterSpacing: {
        display: '-0.02em',
        heading: '-0.01em',
        caption: '0.01em',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"PingFang TC"',
          '"Microsoft JhengHei"',
          '"Noto Sans TC"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SFMono-Regular"',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          '"PingFang TC"',
          '"Microsoft JhengHei"',
          '"Noto Sans TC"',
          'ui-monospace',
          'monospace',
        ],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
