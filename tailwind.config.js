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
        btmColor: '#25A1DA',
        yellow:'#FAB400',
        secondaryYellow:'#FFC107',
        greenText:'#33AB78'
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
    },
  },
  plugins: [require('flowbite/plugin'),
  function({ addUtilities }) {
    const newUtilities = {
      '.popover-arrow': {
        width: '0',
        height: '0',
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: '10px solid white',
        position: 'absolute',
        top: '-5px',
        left: 'calc(50% - 10px)',
      },
    }
    addUtilities(newUtilities)
  }],
})
