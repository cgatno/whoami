import Typography from "typography"

import colors from "../utils/colors"

const typography = new Typography({
  baseFontSize: "18px",
  baseLineHeight: 1.45,
  headerFontFamily: ["Lato", "sans-serif"],
  headerWeight: 400,
  headerColor: colors.defaultText,
  bodyColor: colors.defaultText,
  bodyFontFamily: ["Lora", "serif"],
  googleFonts: [
    {
      name: "Lora",
      styles: ["400", "400i", "700"],
    },
    {
      name: "Lato",
      styles: ["400", "700"],
    },
  ],
})

export default typography
