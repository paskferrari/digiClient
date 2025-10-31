import type { Config } from 'tailwindcss';
import sharedPreset from '@digiclient/config/tailwind';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [sharedPreset as any],
  plugins: [require('tailwindcss-animate')],
};

export default config;