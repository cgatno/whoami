/** @type {import("prettier").Config} */
export default {
  singleQuote: false,
  trailingComma: "all",
  semi: true,
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
