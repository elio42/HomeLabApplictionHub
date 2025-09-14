import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

const colors = {
  brand: {
    50: "#e3f9ff",
    100: "#c8ecff",
    200: "#9dd9ff",
    300: "#6fc4ff",
    400: "#3aaaff",
    500: "#0d8fe6",
    600: "#006fb4",
    700: "#005180",
    800: "#00354d",
    900: "#001c26",
  },
};

const radii = {
  none: "0",
  sm: "3px",
  base: "6px",
  md: "10px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  full: "9999px",
};

const fonts = {
  heading: "Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
  mono: "JetBrains Mono, ui-monospace, monospace",
};

const components = {
  Button: {
    baseStyle: { borderRadius: "md", fontWeight: 600 },
    defaultProps: { colorScheme: "brand", variant: "solid" },
  },
  Tooltip: {
    baseStyle: {
      borderRadius: "md",
      fontSize: "sm",
      px: 2,
      py: 1,
    },
  },
  Tag: {
    baseStyle: { borderRadius: "full", fontWeight: 500 },
  },
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: "lg",
      },
    },
  },
};

export const chakraTheme = extendTheme({
  config,
  colors,
  radii,
  fonts,
  components,
  shadows: { outline: "0 0 0 3px rgba(13,143,230,0.5)" },
});
