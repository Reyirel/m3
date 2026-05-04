// screens/HomeScreen.js - MIGRATION EXAMPLE
// How to migrate toast state to NotificationContext

// ============================================
// ANTES (OLD - Duplicado en 15 pantallas)
// ============================================

import React, { useState } from 'react';
import Toast from '../components/Toast';

function OldHomeScreen() {
  // ❌ DUPLICATED: Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // ❌ DUPLICATED: Toast handler
  const showToast = (message, type = 'success', duration = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), duration);
  };

  // ❌ DUPLICATED: In every async function
  const handleSaveTask = async () => {
    try {
      await saveTask(newTask);
      showToast('Tarea guardada correctamente', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <View>
      {/* ❌ DUPLICATED: Toast component */}
      {toastVisible && (
        <Toast
          message={toastMessage}
          type={toastType}
          onDismiss={() => setToastVisible(false)}
        />
      )}
      {/* ... resto del JSX ... */}
    </View>
  );
}

// ============================================
// DESPUÉS (NEW - Usando NotificationContext)
// ============================================

import React from 'react';
import { useNotification } from '../contexts/NotificationContext';

function NewHomeScreen() {
  // ✅ SINGLE LINE: Get notification functions
  const { showSuccess, showError, showInfo, showWarning } = useNotification();

  // ✅ CLEANER: No toast state management
  const handleSaveTask = async () => {
    try {
      await saveTask(newTask);
      showSuccess('Tarea guardada correctamente');
      // Done! No state management needed
    } catch (err) {
      showError(err.message);
    }
  };

  // ✅ That's it! Toast component is handled by NotificationProvider in App.js
  return (
    <View>
      {/* ... resto del JSX (sin Toast component) ... */}
    </View>
  );
}

// ============================================
// MIGRATION CHECKLIST
// ============================================

/*
Para cada pantalla que usa toast state:

□ 1. Add import
   import { useNotification } from '../contexts/NotificationContext';

□ 2. Replace hook initialization
   const { showSuccess, showError, showInfo, showWarning } = useNotification();

□ 3. Search & replace showToast calls
   showToast('msg', 'success')  →  showSuccess('msg')
   showToast('msg', 'error')    →  showError('msg')
   showToast('msg', 'info')     →  showInfo('msg')
   showToast('msg', 'warning')  →  showWarning('msg')

□ 4. Remove state variables
   delete const [toastVisible, setToastVisible] = useState(false);
   delete const [toastMessage, setToastMessage] = useState('');
   delete const [toastType, setToastType] = useState('success');

□ 5. Remove showToast function
   delete const showToast = (message, type, duration) => { ... };

□ 6. Remove Toast component from render
   delete <Toast message={toastMessage} ... />
   delete {toastVisible && <Toast ... /> }

□ 7. Verify component still compiles
   npm run start (or your build command)

Done! That's it. Your component is now cleaner and uses the centralized toast system.
*/

// ============================================
// SCREENS TO MIGRATE (15 total)
// ============================================

/*
Pantallas que actualmente tienen toast state duplicado:

✅ HomeScreen.js                    (500+ lines, 92 useState)
✅ DashboardScreen.js               (600+ lines, 95 useState)
✅ ReportsScreen.js                 (700+ lines, 88 useState)
✅ TaskDetailScreen.js              (Already updated via useTaskCreation!)
✅ AdminScreen.js                   (400+ lines, 60 useState)
✅ KanbanScreen.js
✅ CalendarScreen.js
✅ NotificationsScreen.js
✅ AreaChiefDashboard.js
✅ AdminExecutiveDashboard.js
✅ SecretarioDashboardScreen.js
✅ MyAreaReportsScreen.js
✅ MyInboxScreen.js
✅ TaskChatScreen.js
✅ TaskProgressScreen.js

Estimated savings: -45 lines per screen × 15 screens = -675 lines of code!
*/

// ============================================
// ADVANCED: Queued Notifications
// ============================================

/*
If you need to show multiple notifications in sequence:

const { queueNotification, showInfo } = useNotification();

// Show first notification immediately
showInfo('Processing...');

// Queue next notification to show after current one
queueNotification({
  message: 'First step done',
  type: 'success',
  duration: 2000,
});

queueNotification({
  message: 'Second step done',
  type: 'success',
  duration: 2000,
});

// They'll show: Processing... → First step... → Second step...
// Each waits for previous to finish before showing
*/

// ============================================
// ADVANCED: Custom Notification Handlers
// ============================================

/*
If you need custom behavior when notification closes:

const { showNotification } = useNotification();

showNotification({
  message: 'Tarea creada',
  type: 'success',
  duration: 3000,
  position: 'top',
  onPress: () => {
    // User tapped the notification
    navigation.navigate('TaskDetail', { taskId });
  },
  onClose: () => {
    // Notification dismissed
    console.log('Notification closed');
  },
});
*/

// ============================================
// TROUBLESHOOTING
// ============================================

/*
Problem: "useNotification must be used inside NotificationProvider"
Solution: Make sure NotificationProvider wraps your screen in App.js
          It's already configured in App.js around TasksProvider

Problem: Toast doesn't appear
Solution: Check that NotificationProvider is in the App.js tree
          Also ensure Toast from 'react-native-toast-message' is imported in App.js

Problem: Multiple toasts showing at same time
Solution: Use queueNotification() instead of multiple showSuccess() calls
          Or wait for first notification to finish before showing next

Problem: Toast not positioned correctly
Solution: Pass position parameter: showError('msg', 5000, 'top')
          Default positions: 'bottom' for success/info, 'top' for error/warning
*/

export default NewHomeScreen;
