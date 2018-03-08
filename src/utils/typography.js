import Typography from "typography"
import gray from "gray-percentage"

const typography = new Typography({
  baseFontSize: "18px",
  baseLineHeight: 1.45,
  headerFontFamily: ["Lato", "sans-serif"],
  headerWeight: 400,
  headerColor: gray(30),
  bodyColor: gray(30),
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
