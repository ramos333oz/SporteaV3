import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

// Create context
const ToastContext = createContext(null);

/**
 * Custom hook to use the toast context
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast Provider component
 * Wraps application to provide toast notification functionality
 */
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    open: false,
    severity: 'info',
    title: '',
    message: '',
    duration: 5000,
  });

  /**
   * Show a toast notification
   * @param {string} title - Title of the toast
   * @param {string} message - Message content
   * @param {string} severity - Severity level (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds
   */
  const showToast = useCallback((title, message, severity = 'info', duration = 5000) => {
    setToast({
      open: true,
      severity,
      title,
      message,
      duration,
    });
  }, []);

  /**
   * Clear the current toast notification
   */
  const clearToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  // Convenience methods for different toast types
  const showSuccessToast = useCallback((title, message, duration) => 
    showToast(title, message, 'success', duration), [showToast]);
  
  const showErrorToast = useCallback((title, message, duration) => 
    showToast(title, message, 'error', duration), [showToast]);
  
  const showWarningToast = useCallback((title, message, duration) => 
    showToast(title, message, 'warning', duration), [showToast]);
  
  const showInfoToast = useCallback((title, message, duration) => 
    showToast(title, message, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccessToast,
        showErrorToast,
        showWarningToast,
        showInfoToast,
        clearToast,
      }}
    >
      {children}
      <Toast
        open={toast.open}
        severity={toast.severity}
        title={toast.title}
        message={toast.message}
        duration={toast.duration}
        onClose={clearToast}
      />
    </ToastContext.Provider>
  );
};

export default ToastContext;
