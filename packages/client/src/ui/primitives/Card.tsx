import React from "react";
import { Box, BoxProps, useColorModeValue } from "@chakra-ui/react";

export const Card: React.FC<BoxProps> = (props) => {
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  return (
    <Box
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
      boxShadow="sm"
      _hover={{ boxShadow: "md" }}
      transition="box-shadow 120ms"
      {...props}
    />
  );
};
