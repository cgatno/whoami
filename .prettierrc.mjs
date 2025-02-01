/** @type {import("prettier").Config} */
export default {
  semi: true,
  trailingComma: "all",
  singleQuote: false,
  plugins: ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
