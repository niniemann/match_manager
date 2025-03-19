// created by AI - let's see how well this hold's up. :P

import React from "react";
import { toast } from "react-toastify";

export const showErrorToast = (error) => {
  // If there's no error object, fallback to a generic message.
  if (!error) {
    toast.error("An unknown error occurred.");
    return;
  }

  // Extract a usable response:
  // If error.response exists (as in typical axios errors), use its data if available.
  // Otherwise, if error.data exists, use that.
  // Fall back to the error object itself.
  const response =
    error.response && (error.response.data || error.response)
      ? error.response.data || error.response
      : error.data
      ? error.data
      : error;

  // If response is a plain string, show it immediately.
  if (typeof response === "string") {
    toast.error(response);
    return;
  }

  // If response contains a title and an errors array, display those details.
  if (response.title && Array.isArray(response.errors)) {
    const { title, errors } = response;
    const formattedErrors = errors.map((err) => {
      // Optionally include error type and location.
      const typeInfo = err.type ? ` (${err.type})` : "";
      const locationInfo = err.loc ? ` at ${err.loc}` : "";
      return `${err.msg}${typeInfo}${locationInfo}`;
    });
    toast.error(`${title}:\n${formattedErrors.join(" | ")}`);
    return;
  }

  // Fallback: include additional info from React Query / axios errors.
  // Include a status code if available (either directly on error or on error.response)
  let statusInfo = "";
  const status =
    error.status || (error.response && error.response.status);
  if (status) {
    statusInfo = `Status: ${status}\n`;
  }

  // Use error.message if available; otherwise, stringify the remaining response.
  const message = response.message || JSON.stringify(response, null, 2);

  toast.error(`Unexpected error:\n${statusInfo}${message}`);
};

export const ErrorToast = ({ error }) => {
  React.useEffect(() => {
    if (error) {
      showErrorToast(error);
    }
  }, [error]);

  return null;
};
