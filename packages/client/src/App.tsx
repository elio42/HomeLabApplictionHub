import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./routes/Home";
import { Box } from "@chakra-ui/react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { chakraTheme } from "./chakraTheme";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={chakraTheme}>
        <ColorModeScript
          initialColorMode={chakraTheme.config.initialColorMode}
        />
        <BrowserRouter>
          <Box maxW="1600px" mx="auto" py={4} px={4}>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </Box>
        </BrowserRouter>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
