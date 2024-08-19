import { useState } from "react";
import { Modal, Box, SpaceBetween, Button, Input } from "@cloudscape-design/components";

/// a confirmation dialog that requires extra user input
export function CriticalConfirmationDialog({ header, visible, onDismiss, onConfirm, confirmationText, children }) {
  const [inputValue, setInputValue] = useState("");
  const handleInputChange = (event) => setInputValue(event.detail.value);

  const dismiss = () => {
    setInputValue("");
    onDismiss();
  };

  const confirm = () => {
    setInputValue("");
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={dismiss}
      header={header}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={dismiss} variant="link">
              Cancel
            </Button>
            <Button
              onClick={confirm}
              disabled={inputValue !== (confirmationText || "")}
              disabledReason="Please type the required phrase to confirm."
            >
              Confirm
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="s">
        {children}
        {confirmationText ? (
          <>
            <p>
              Please type <code>{confirmationText}</code> to confirm.
            </p>
            <Input value={inputValue} onChange={handleInputChange} />
          </>
        ) : (
          ""
        )}
      </SpaceBetween>
    </Modal>
  );
}
