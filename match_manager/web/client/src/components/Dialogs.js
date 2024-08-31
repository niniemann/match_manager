import { useState } from "react";
import { Modal, Box, SpaceBetween, Button, Input, Alert, Table } from "@cloudscape-design/components";

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
              variant="primary"
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

/// formatted pydantic-validation error for all types of api request issues
/// -- this is an error-type <Alert>
function PydanticValidationError({ error }) {
  // see: https://docs.pydantic.dev/latest/api/pydantic_core/#pydantic_core.ValidationError
  return (
    <Alert type="error" header={error.title}>
      <table>
        <tbody>
          {error.errors.map((err) => (
            <tr>
              <td className="pr-4">{err.loc}</td>
              <td>{err.msg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Alert>
  );
}

/// formatted error from api requests -- might be a list of pydantic validation errors, or some
/// other (internal, database, ...) exception
export function ApiCallError({ error }) {
  const is_pydantic_error = error.title !== undefined && error.errors !== undefined;

  return (
    <>
      {is_pydantic_error && <PydanticValidationError error={error} />}
      {!is_pydantic_error && <Alert type="error">{error}</Alert>}
    </>
  );
}
