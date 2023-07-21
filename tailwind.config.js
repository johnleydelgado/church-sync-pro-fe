/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('tailwindcss').Config} */
const withMT = require("@material-tailwind/react/utils/withMT");
module.exports = withMT({
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        lato: ['Lato', 'sans-serif'],
      },
      colors: {
        bgColor: 'rgba(227,242,253,255)',
        primary: '#27A1DB',
        secondary: '#A7D5E5',
        cream: '#FCEFE9',
        grayBlue: '#EDEFFE',
        otherGray: '#fefefe',
        btmColor: '#25A1DA'
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
    },
  },
  plugins: [require('flowbite/plugin')],
})
