import { useState, useCallback } from "react";

export function useConfirm() {
  const [state, setState] = useState({ open: false, message: "", resolve: null });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });
  }, []);

  const handleClose = (result) => {
    state.resolve(result);
    setState({ open: false, message: "", resolve: null });
  };

  return {
    confirm,
    dialogProps: {
      open: state.open,
      message: state.message,
      onConfirm: () => handleClose(true),
      onCancel: () => handleClose(false),
    },
  };
}