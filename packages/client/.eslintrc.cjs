module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: { react: { version: "detect" } },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@mui/material",
            message: "MUI is deprecated; use Chakra components via ui layer.",
          },
          {
            name: "@mui/icons-material",
            message: "MUI icons removed; use react-icons.",
          },
        ],
        patterns: ["@mui/*"],
      },
    ],
  },
};
