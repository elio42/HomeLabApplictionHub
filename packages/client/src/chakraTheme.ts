import { Box, extendTheme, ThemeConfig } from "@chakra-ui/react";
import { baseStyle } from "@chakra-ui/react/dist/types/avatar/avatar";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

const colors = {
  brand: {
    50: "#e9f6ff",
    100: "#d3edff",
    200: "#a6dcff",
    300: "#78c9ff",
    400: "#43b2ff",
    500: "#1599f2", // primary base
    600: "#0d76c0",
    700: "#08548a",
    800: "#05375a",
    900: "#02202f",
  },
  neutral: {
    50: "#f3f4f6",
    100: "#e4e6ea",
    200: "#ccd0d6",
    300: "#b1b8c0",
    400: "#939ca7",
    500: "#757f8b", // mid gray pivot
    600: "#5c656f",
    700: "#444d55",
    800: "#2e353b",
    900: "#1c2125",
  },
};

const fonts = {};

const components = {
  Button: {
    baseStyle: { borderRadius: "full" },
    defaultProps: { colorScheme: "brand", variant: "solid" },
  },
  Select: {},
  Tooltip: {
    baseStyle: {
      borderRadius: "full",
      fontSize: "sm",
      px: 2,
      py: 1,
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: "full",
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        borderWidth: "1px",
        borderRadius: "lg",
        boxShadow: "sm",
        transition: "box-shadow 120ms, transform 120ms",
        _hover: { boxShadow: "md" },
        bg: "white",
        _dark: { bg: "gray.800" },
      },
    },
    variants: {
      tile: {
        container: {
          p: 3,
          minH: "76px",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: 3,
        },
      },
      flat: {
        container: {
          boxShadow: "none",
          _hover: { boxShadow: "sm" },
        },
      },
    },
    defaultProps: {
      variant: "tile",
    },
  },
};

export const chakraTheme = extendTheme({
  config,
  colors,
  fonts,
  components,
  styles: {
    global: () => ({}),
  },
  shadows: { outline: "0 0 0 3px rgba(13,143,230,0.5)" },
});
