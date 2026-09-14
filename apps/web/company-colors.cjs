// Green_Only_Website_Color_Selection_Map_for_Clients, page 6.
// Legacy utility names resolve to these ramps, including hover/opacity variants.
const green = {
  50: '#F4FBF5', 100: '#E8F5E9', 200: '#C8E6C9', 300: '#A5D6A7',
  400: '#66BB6A', 500: '#43A047', 600: '#2E7D32', 700: '#256B2A',
  800: '#1B5E20', 900: '#123524', 950: '#123524',
};
const neutral = { ...green, 200: '#E3EEE5', 300: '#C8E6C9', 400: '#5F7565', 500: '#5F7565', 600: '#355E3B', 700: '#355E3B', 800: '#123524' };
const information = { ...green, 500: '#3B7A57', 600: '#3B7A57', 700: '#355E3B' };
const warning = { ...green, 500: '#6B8E23', 600: '#6B8E23', 700: '#355E3B' };
const danger = { ...green, 500: '#355E3B', 600: '#355E3B', 700: '#355E3B' };
module.exports = {
  green, emerald: green, lime: green, teal: information, cyan: information,
  blue: information, sky: information, indigo: information, violet: information, purple: information,
  amber: warning, yellow: warning, orange: warning, red: danger, rose: danger, pink: danger, fuchsia: danger,
  slate: neutral, gray: neutral, zinc: neutral, neutral, stone: neutral,
};
