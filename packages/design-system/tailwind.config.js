/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.tsx'],
  theme: {
    fontFamily: {
      title: ['TTHoves-Medium', 'sans-serif'],
      body: ['Circular-STD', 'sans-serif'],
      arial: ['Arial', 'Helvetica', 'sans-serif'],
      mono: ['monospace'],
    },
    colors: {
      inherit: 'inherit',
      transparent: 'transparent',
      current: 'currentColor',
      green: {
        50: '#F2FFF8',
        100: '#DEFCEC',
        200: '#ADF6CF',
        300: '#69F0AF',
        400: '#00E890',
        500: '#00DE7B',
        600: '#00D465',
        700: '#00C45A',
        800: '#00B04C',
        900: '#009E40',
        1000: '#004633',
      },
      gray: {
        50: '#F9F9FB',
        100: '#F3F3F6',
        200: '#E5E5EB',
        300: '#D2D2DB',
        400: '#A3A3AF',
        500: '#717180',
        600: '#4F4F63',
        700: '#3C3C51',
        800: '#232337',
        900: '#111127',
      },
      red: {
        50: '#FFF5F6',
        100: '#FFEBED',
        200: '#FFCDCF',
        300: '#FF9A93',
        400: '#F7736A',
        500: '#FF5543',
        600: '#FF4822',
        700: '#F43E25',
        800: '#E2331F',
        900: '#C52108',
        1000: '#4F1D33',
      },
      orange: {
        50: '#FFF9EF',
        100: '#FFF3E0',
        200: '#FFE0B2',
        300: '#FFCD80',
        400: '#FFB84D',
        500: '#FFA826',
        600: '#FF9900',
        700: '#FB8D00',
        800: '#F57D00',
        900: '#EF6D00',
        1000: '#4F3016',
      },
      blue: {
        50: '#F4F4FC',
        100: '#E9E9F9',
        200: '#C8C8F1',
        300: '#A3A5E7',
        400: '#7D81DE',
        500: '#6164D6',
        600: '#4747CD',
        700: '#423FC2',
        800: '#3834B6',
        900: '#3029AA',
        1000: '#181855',
      },
      purple: {
        50: '#F9F2FF',
        100: '#F4E5FF',
        200: '#E3BFFE',
        300: '#D093FF',
        400: '#BA68F9',
        500: '#A848F0',
        600: '#962AE6',
        700: '#8429DF',
        800: '#6927D7',
        900: '#5025CF',
        1000: '#330F62',
      },
      bubble: {
        50: '#FFF3FE',
        100: '#FFE6FD',
        200: '#FFC0FA',
        300: '#FF93F8',
        400: '#F962F0',
        500: '#A848F0',
        600: '#E400DC',
        700: '#D400D6',
        800: '#BE00D0',
        900: '#AA00CA',
        1000: '#4F105E',
      },
      sour: {
        50: '#F2FEFF',
        100: '#E5FDFF',
        200: '#BDFAFE',
        300: '#93F8FF',
        400: '#6BF3FF',
        500: '#53EEFC',
        600: '#4AE9FC',
        700: '#45D7E8',
        800: '#3FC0CC',
        900: '#3AABB3',
        1000: '#0D4A62',
      },
      cola: {
        50: '#FFEFE1',
        100: '#FFDFC3',
        200: '#FFBEA7',
        300: '#E29A85',
        400: '#C17860',
        500: '#AA5D45',
        600: '#92422A',
        700: '#863925',
        800: '#752D1C',
        900: '#661F17',
        1000: '#4F0E0B',
      },
      raspberry: {
        50: '#FFF2F7',
        100: '#FEE5F0',
        200: '#FEBEDA',
        300: '#FF93C2',
        400: '#FF66A8',
        500: '#FE4392',
        600: '#FF1F7C',
        700: '#EC1C78',
        800: '#D51B72',
        900: '#BF196D',
        1000: '#4E0E3E',
      },
      white: '#FFFFFF',
      black: '#111127',
    },
  },
  plugins: [],
};