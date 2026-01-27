import { useState, useCallback } from 'react';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    show: false
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({
      message,
      type,
      show: true
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      show: false
    }));
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo
  };
}