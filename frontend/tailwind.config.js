/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bnr: {
          dark:   '#5C3B0E',   // sidebar background, primary buttons
          brown:  '#7B5218',   // hover / active states
          cream:  '#F3E6C5',   // page background
          muted:  '#E5D5A8',   // borders, table stripes
          light:  '#FBF6EC',   // card / form backgrounds
          text:   '#2C1800',   // primary headings
          subtle: '#8B7350',   // secondary text
        },
      },
    },
  },
  plugins: [],
};
