/** @type {import("prettier").Config} */
export default {
  semi: true,
  trailingComma: "all",
  singleQuote: false,
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
