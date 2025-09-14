import React, { ReactNode } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  ModalProps,
} from "@chakra-ui/react";

interface AppDialogProps extends Omit<ModalProps, "children"> {
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export const AppDialog = ({
  title,
  footer,
  children,
  ...rest
}: AppDialogProps) => (
  <Modal isCentered {...rest}>
    <ModalOverlay />
    <ModalContent>
      {title && <ModalHeader>{title}</ModalHeader>}
      <ModalCloseButton />
      <ModalBody>{children}</ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </ModalContent>
  </Modal>
);
