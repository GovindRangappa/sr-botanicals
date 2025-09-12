module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',  // ✅ add this
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',    // keep this in case you use src/ too
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        garamond: ['"Cormorant Garamond"', 'serif'],
        prata: ['"Prata"', 'serif'],
      },
    },
  },
  plugins: [],
};
