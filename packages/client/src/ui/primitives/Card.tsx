import {
  Card as ChakraCard,
  CardProps as ChakraCardProps,
} from "@chakra-ui/react";
import React from "react";

export interface CardProps extends ChakraCardProps {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, variant, ...rest }, ref) => (
    <ChakraCard
      ref={ref}
      variant={variant || "tile"}
      {...(interactive && {
        _hover: { boxShadow: "lg", transform: "translateY(-2px)" },
      })}
      {...rest}
    />
  )
);
Card.displayName = "Card";
