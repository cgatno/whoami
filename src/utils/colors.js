import gray from "gray-percentage"

// Exports color palette
const colorValues = {
  primaryColor: `#004FFE`,
  primaryColorLight: `#4081FF`,
  accentColor: `#302B2B`,
  defaultText: gray(30),
  lightText: gray(80),
  gradientPalette: [
    `#4081FF`,
    `#D973E8`,
    `#FF73B6`,
    `#FF9682`,
    `#FFC862`,
    `#F9F871`,
  ],
}

export default colorValues

export const getRandomGradientColor = () =>
  colorValues.gradientPalette[
    Math.floor(Math.random() * (colorValues.gradientPalette.length - 1))
  ]
