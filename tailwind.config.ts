import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        iujo: {
          red: '#d32f2f',
          dark: '#9a1b1b',
          soft: '#fef2f2',
        },
      },
    },
  },
  plugins: [],
};

export default config;

