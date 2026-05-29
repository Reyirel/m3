/**
 * contexts/NotificationContext.js
 * Centralized notification/toast management
 * Eliminates duplicate toast state from 15+ screens
 */

import React, { createContext, useState, useContext, useCallback, useMemo, useRef } from 'react';
import Toast from 'react-native-toast-message';

// Use globalThis to ensure shared instances for lazy-loaded bundles
if (!globalThis.__NOTIFICATION_CONTEXT__) {
  globalThis.__NOTIFICATION_CONTEXT__ = createContext();
}

const NotificationContext = globalThis.__NOTIFICATION_CONTEXT__;

/**
 * Hook to use notifications throughout the app
 * @returns {Object} { showNotification, hideNotification, showError, showSuccess, showInfo, showWarning }
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return no-op functions as fallback
    return {
      showNotification: () => {},
      hideNotification: () => {},
      showError: () => {},
      showSuccess: () => {},
      showInfo: () => {},
      showWarning: () => {},
      currentNotification: null,
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [_notificationQueue, setNotificationQueue] = useState([]);
  const notificationQueueRef = useRef([]);

  /**
   * Show a notification with specified type and message
   * @param {string} message - Notification message
   * @param {string} type - Type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Display duration in ms (default 3000)
   * @param {Object} position - Position: 'top', 'bottom' (default 'bottom')
   * @param {Function} onPress - Callback when notification is pressed
   * @param {Function} onClose - Callback when notification closes
   */
  const showNotification = useCallback(({
    message,
    type = 'info',
    duration = 3000,
    position = 'bottom',
    onPress,
    onClose,
  }) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      duration,
      position,
      onPress,
      onClose,
      visible: true,
    };

    setCurrentNotification(notification);

    // Show with react-native-toast-message
    // 'warning' no es un tipo nativo — se mapea a 'info'
    const toastType = type === 'warning' ? 'info' : type;
    Toast.show({
      type: toastType,
      position,
      text1: message,
      duration,
      onPress: () => {
        onPress?.();
      },
      onHide: () => {
        setCurrentNotification(null);
        onClose?.();
        // Process queue using ref to avoid stale closure
        if (notificationQueueRef.current.length > 0) {
          const next = notificationQueueRef.current[0];
          notificationQueueRef.current = notificationQueueRef.current.slice(1);
          setNotificationQueue(notificationQueueRef.current);
          showNotification(next);
        }
      },
    });
  }, []);

  /**
   * Hide current notification
   */
  const hideNotification = useCallback(() => {
    Toast.hide();
    setCurrentNotification(null);
  }, []);

  /**
   * Show error notification
   */
  const showError = useCallback((message, duration = 4000) => {
    showNotification({
      message,
      type: 'error',
      duration,
      position: 'top',
    });
  }, [showNotification]);

  /**
   * Show success notification
   */
  const showSuccess = useCallback((message, duration = 3000) => {
    showNotification({
      message,
      type: 'success',
      duration,
      position: 'bottom',
    });
  }, [showNotification]);

  /**
   * Show info notification
   */
  const showInfo = useCallback((message, duration = 3000) => {
    showNotification({
      message,
      type: 'info',
      duration,
      position: 'bottom',
    });
  }, [showNotification]);

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message, duration = 3000) => {
    showNotification({
      message,
      type: 'warning',
      duration,
      position: 'top',
    });
  }, [showNotification]);

  /**
   * Queue a notification to show after current one
   */
  const queueNotification = useCallback((notification) => {
    notificationQueueRef.current = [...notificationQueueRef.current, notification];
    setNotificationQueue(notificationQueueRef.current);
  }, []);

  const value = useMemo(() => ({
    showNotification,
    hideNotification,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    queueNotification,
    currentNotification,
  }), [showNotification, hideNotification, showError, showSuccess, showInfo, showWarning, queueNotification, currentNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
