/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
