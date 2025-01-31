import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // Your custom color palette
        primary: {
          DEFAULT: "#401F71", // Deep Purple
          light: "#9B7BE1", // Light Purple (dark mode)
        },
        secondary: {
          DEFAULT: "#824D74", // Mauve
          light: "#D48FA3", // Light Mauve (dark mode)
        },
        accent: {
          DEFAULT: "#BE7B72", // Coral
          light: "#E7A599", // Light Coral (dark mode)
        },
        highlight: {
          DEFAULT: "#FDAF7B", // Peach
        },
        // Dark mode background
        darkbg: "#1A1527",
        fontFamily: {
          sans: ["Plus Jakarta Sans Variable", ...defaultTheme.fontFamily.sans],
          serif: ["Fraunces Variable", ...defaultTheme.fontFamily.serif],
        },
      },
      // Optional: Add custom background colors for different elements
      backgroundColor: (theme) => ({
        ...theme("colors"),
        "dark-code": "#141020", // Darker background for code blocks
      }),
    },
  },

  plugins: [],
};
