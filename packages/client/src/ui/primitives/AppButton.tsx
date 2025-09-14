import React from "react";
import { Button, ButtonProps } from "@chakra-ui/react";

export const AppButton: React.FC<ButtonProps> = (props) => (
  <Button borderRadius="md" {...props} />
);
