// App.js - VERSIÓN COMPLETA CON TABS - Compatible con web
import './polyfills'; // Debe ser lo primero
import 'react-native-gesture-handler';

// Filtrar ruido de librerías en web (aplica siempre, dev y prod)
const originalError = console.error;
const originalWarn  = console.warn;
const NOISE_PATTERNS = [
  'CORS', 'favicon', 'transform-origin',
  'Unexpected text node', 'onStartShouldSetResponder', 'onResponder',
];
console.error = (...args) => {
  const msg = args[0]?.toString() || '';
  if (NOISE_PATTERNS.some(p => msg.includes(p))) return;
  originalError(...args);
};
console.warn = (...args) => {
  const msg = args[0]?.toString() || '';
  if (NOISE_PATTERNS.some(p => msg.includes(p))) return;
  originalWarn(...args);
};

// Suprimir logs en producción (no en desarrollo)
const _isProd = typeof __DEV__ !== 'undefined' ? !__DEV__ : process.env.NODE_ENV === 'production';
if (_isProd) {
  console.log  = () => {};
  console.info = () => {};
  console.debug = () => {};
}

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TasksProvider, useTasks } from './contexts/TasksContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { getGestureHandlerRootView } from './utils/platformComponents';
import PremiumTabBar from './components/PremiumTabBar';
import { ScreenTransition } from './components';
import MeshBackground from './components/MeshBackground';

// ✅ OPTIMIZACIÓN: Lazy loading de screens (-40% bundle inicial)
const LoginScreen = React.lazy(() => import('./screens/LoginScreen'));
const HomeScreen = React.lazy(() => import('./screens/HomeScreen'));
const KanbanScreen = React.lazy(() => import('./screens/KanbanScreen'));
const CalendarScreen = React.lazy(() => import('./screens/CalendarScreen'));
const AdminScreen = React.lazy(() => import('./screens/AdminScreen'));
const SecretarioDashboardScreen = React.lazy(() => import('./screens/SecretarioDashboardScreen'));
const AdminExecutiveDashboard = React.lazy(() => import('./screens/AdminExecutiveDashboard'));
const AdminReportsScreen = React.lazy(() => import('./screens/AdminReportsScreen'));
const MyAreaReportsScreen = React.lazy(() => import('./screens/MyAreaReportsScreen'));
const MyInboxScreen = React.lazy(() => import('./screens/MyInboxScreen'));
const TaskDetailScreen = React.lazy(() => import('./screens/TaskDetailScreen'));
const TaskChatScreen = React.lazy(() => import('./screens/TaskChatScreen'));
const TaskProgressScreen = React.lazy(() => import('./screens/TaskProgressScreen'));
const ReportsScreen = React.lazy(() => import('./screens/ReportsScreen'));
const NotificationsScreen = React.lazy(() => import('./screens/NotificationsScreen'));
const AreaChiefDashboard = React.lazy(() => import('./screens/AreaChiefDashboard'));
const AreaManagementScreen = React.lazy(() => import('./screens/area/AreaManagementScreen'));
const AnalyticsScreen = React.lazy(() => import('./screens/AnalyticsScreen'));
const TaskReportsAndActivityScreen = React.lazy(() => import('./screens/TaskReportsAndActivityScreen'));
import { getCurrentSession, logoutUser } from './services/authFirestore';
import { startConnectivityMonitoring } from './services/offlineQueue';
import { toMs } from './utils/dateUtils';
import { setupNotificationResponseListener } from './services/notifications';
import { initConnectionListener, clearOfflineData } from './services/offlineSync';
import OfflineIndicator from './components/OfflineIndicator';
import OfflineSyncIndicator from './components/OfflineSyncIndicator';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import ImprovedErrorBoundary from './components/ImprovedErrorBoundary';
import { startAutoCacheCleanup, stopAutoCacheCleanup } from './utils/cacheManager';
import * as productionLogger from './utils/productionLogger';
import logger from './services/Logger';
import { startNetworkMonitoring, stopNetworkMonitoring } from './utils/networkMonitor';

// ✅ OPTIMIZACIÓN: Performance Monitoring
if (Platform.OS === 'web') {
  try {
    require('./utils/performanceMonitor');
    // Se inicializará en el useEffect de App
  } catch (e) {
    // Performance monitoring no disponible
  }
}

// Vercel Analytics y Speed Insights (solo en web)
let Analytics, SpeedInsights;
if (Platform.OS === 'web') {
  try {
    Analytics = require('@vercel/analytics/react').Analytics;
    SpeedInsights = require('@vercel/speed-insights/react').SpeedInsights;
  } catch (e) {
    // Vercel analytics not available
  }
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GestureHandlerRootView = getGestureHandlerRootView();

// 🔄 Componente de carga para lazy-loaded screens
function ScreenFallback() {
  const { theme } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

// Tab Navigator con todas las pantallas
function MainTabs({ onLogout, initialSession }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks: contextTasks } = useTasks();
  // Usar initialSession para evitar flash de tabs condicionales en primer render
  const [currentUser, setCurrentUser] = useState(initialSession || null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0); // 🔔 Tareas urgentes (vencidas + próximas <24h)
  const unsubPushRef = useRef(null);

  // Obtener sesión actual solo una vez al montar
  useEffect(() => {
    let mounted = true;
    getCurrentSession().then((result) => {
      if (result.success && mounted) {
        setCurrentUser(result.session);
        // Inicializar notificaciones locales
        const { configureNotifications } = require('./services/notificationsAdvanced');
        configureNotifications().catch(console.error);

        // Registrar push notification token para FCM
        const { registerPushToken, setupPushNotificationListener } = require('./services/pushNotifications');
        registerPushToken(result.session.uid).catch((err) => {
          console.warn('Push token registration skipped (non-critical):', err.message);
        });

        // Setup push notification listener
        unsubPushRef.current = setupPushNotificationListener((notification) => {
          // Toast de notificación
          Toast.show({
            type: 'success',
            text1: notification.title,
            text2: notification.body,
            position: 'top'
          });
        });
      }
    });
    return () => {
      mounted = false;
      unsubPushRef.current?.();
    };
  }, []);

  // Calcular badges de vencidas/urgentes desde el context (ya filtrado por rol)
  useEffect(() => {
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;

    const overdueNow = contextTasks.filter(t => toMs(t.dueAt) < now && t.status !== 'cerrada');
    const urgent = contextTasks.filter(t => t.status !== 'cerrada' && toMs(t.dueAt) < tomorrow);

    setOverdueCount(overdueNow.length);
    setUrgentCount(urgent.length);

    if (Platform.OS !== 'web') {
      try {
        const Notifications = require('expo-notifications');
        Notifications.default?.setBadgeCountAsync(overdueNow.length).catch(() => {});
      } catch {
        // no-op
      }
    }
  }, [contextTasks]);

  const isAdmin = currentUser?.role === 'admin';
  const isSecretario = currentUser?.role === 'secretario';
  const isDirector = currentUser?.role === 'director';
  const canSeeReports = isAdmin || isSecretario || isDirector;

  // Función para obtener el label del rol
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'secretario': return 'Secretario';
      case 'director': return 'Director';
      default: return 'Director';
    }
  };

  // Función para obtener el color del badge por rol
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return theme.error;
      case 'secretario': return theme.primary;
      case 'director': return theme.success;
      default: return theme.info;
    }
  };

  // Función para obtener el icono del rol
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'shield-checkmark';
      case 'secretario': return 'briefcase';
      case 'director': return 'business';
      default: return 'person';
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBarComponent={PremiumTabBar}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Kanban') iconName = focused ? 'apps' : 'apps-outline';
            else if (route.name === 'Calendar') iconName = focused ? 'calendar' : 'calendar-outline';
            else if (route.name === 'Reports') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            else if (route.name === 'Admin') iconName = focused ? 'settings' : 'settings-outline';
            else if (route.name === 'Inbox') iconName = focused ? 'file-tray-full' : 'file-tray-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.iconInactive,
          isDark: isDark,
          insets: insets,
        })}
      >
      <Tab.Screen 
        name="Home" 
        options={{ 
          title: 'Inicio',
          tabBarBadge: urgentCount > 0 ? urgentCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: urgentCount > 3 ? theme.error : theme.warning,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: theme.card,
          },
        }}
      >
        {(props) => (
          <Suspense fallback={<ScreenFallback />}>
            <HomeScreen {...props} onLogout={onLogout} />
          </Suspense>
        )}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Kanban" 
        options={{ title: 'Tablero' }} 
      >
        {(props) => (
          <Suspense fallback={<ScreenFallback />}>
            <KanbanScreen {...props} />
          </Suspense>
        )}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Calendar" 
        options={{ title: 'Calendario' }} 
      >
        {(props) => (
          <Suspense fallback={<ScreenFallback />}>
            <CalendarScreen {...props} />
          </Suspense>
        )}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Inbox" 
        options={{ 
          title: 'Bandeja',
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.error,
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: theme.card,
            top: -2
          }
        }} 
      >
        {(props) => (
          <Suspense fallback={<ScreenFallback />}>
            <MyInboxScreen {...props} />
          </Suspense>
        )}
      </Tab.Screen>
      
      {canSeeReports && (
        <Tab.Screen 
          name="Reports" 
          options={{ title: 'Reportes' }} 
        >
          {(props) => (
            <Suspense fallback={<ScreenFallback />}>
              <ReportsScreen {...props} />
            </Suspense>
          )}
        </Tab.Screen>
      )}
      
      {isSecretario && (
        <Tab.Screen 
          name="SecretarioDashboard" 
          options={{ 
            title: 'Mi Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="briefcase" size={size} color={color} />
            ),
          }}
        >
          {(props) => (
            <Suspense fallback={<ScreenFallback />}>
              <SecretarioDashboardScreen {...props} />
            </Suspense>
          )}
        </Tab.Screen>
      )}
      
      {isAdmin && (
        <Tab.Screen 
          name="ExecutiveDashboard" 
          options={{ 
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="speedometer" size={size} color={color} />
            ),
          }}
        >
          {(props) => (
            <Suspense fallback={<ScreenFallback />}>
              <AdminExecutiveDashboard {...props} />
            </Suspense>
          )}
        </Tab.Screen>
      )}
      
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          options={{ title: 'Admin' }}
        >
          {(props) => (
            <Suspense fallback={<ScreenFallback />}>
              <AdminScreen {...props} onLogout={onLogout} />
            </Suspense>
          )}
        </Tab.Screen>
      )}
    </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialSession, setInitialSession] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const navigationRef = useRef(null);
  
  // Función de logout que maneja todo el proceso
  const handleLogout = async () => {
    // Siempre cerrar sesión aunque algo falle
    try { await logoutUser(); } catch {}
    try { await clearOfflineData(); } catch {}
    setIsAuthenticated(false);
    setIsLoading(false);
    setForceUpdate(prev => prev + 1);
    try {
      Toast.show({ type: 'success', text1: 'Sesión cerrada', position: 'top' });
    } catch {}
  };
  
  useEffect(() => {
    let mounted = true;
    
    // 🚀 Inicializar logger de producción
    productionLogger.logInfo('App starting');
    logger.info('App', 'Application starting', { platform: Platform.OS });
    
    // ✅ OPTIMIZACIÓN: Inicializar Performance Monitoring
    if (Platform.OS === 'web') {
      try {
        const { initPerformanceMonitoring } = require('./utils/performanceMonitor');
        initPerformanceMonitoring({
          enableLogging: false, // Set to true for debugging
          onMetric: (metric) => {
            // Enviar a Vercel Analytics si está disponible
            if (typeof gtag !== 'undefined') {
              gtag('event', metric.name, {
                value: Math.round(metric.value),
                event_category: 'Web Vitals',
              });
            }
          }
        });
      } catch (e) {
        console.warn('Performance monitoring failed:', e.message);
      }
    }
    
    // 💾 Inicializar auto-limpieza de cache
    startAutoCacheCleanup();
    
    // 🌐 Inicializar network quality monitor
    startNetworkMonitoring();
    
    // Iniciar monitoreo de conectividad para sincronización offline
    const unsubscribeConnectivity = startConnectivityMonitoring();
    
    // 🌐 Inicializar listener de conexión para sincronización offline-first
    const unsubscribeConnection = initConnectionListener();
    
    // 🔔 Setup del listener de respuestas de notificaciones
    const notificationSubscription = setupNotificationResponseListener();
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 2000);
    
    getCurrentSession()
      .then((result) => {
        if (mounted) {
          setIsAuthenticated(result.success);
          setIsLoading(false);
          clearTimeout(timeout);
          if (result.success) {
            setInitialSession(result.session);
            productionLogger.logInfo('User authenticated', { userId: result.session?.uid });
          }
        }
      })
      .catch((error) => {
        productionLogger.logError('Auth error', error);
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      });
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (unsubscribeConnectivity) unsubscribeConnectivity();
      if (unsubscribeConnection) unsubscribeConnection();
      if (notificationSubscription) notificationSubscription.remove();
      stopAutoCacheCleanup();
      stopNetworkMonitoring();
    };
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }
  
  return (
    <ImprovedErrorBoundary navigation={navigationRef}>
      <ErrorBoundary>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MeshBackground>
        {/* Indicador de estado offline */}
        {isAuthenticated && <OfflineIndicator />}
        {/* Indicador de reportes pendientes de sincronizar */}
        {isAuthenticated && <OfflineSyncIndicator compact={true} />}

        <NotificationProvider>
        <TasksProvider key={forceUpdate}>
        <OfflineBanner />
        <NavigationContainer ref={navigationRef} key={`navigation-${forceUpdate}`}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
              animationDuration: Platform.OS === 'web' ? 300 : 400,
              animationEnabled: true,
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen
                name="Login"
                options={{ animation: 'fade' }}
              >
                {(props) => (
                  <Suspense fallback={<ScreenFallback />}>
                    <LoginScreen
                      {...props}
                      onLogin={() => {
                        setIsAuthenticated(true);
                        setForceUpdate(prev => prev + 1);
                      }}
                    />
                  </Suspense>
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen
                  name="Main"
                  options={{ animation: 'fade' }}
                >
                  {(props) => (
                    <MainTabs
                      {...props}
                      onLogout={handleLogout}
                      initialSession={initialSession}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskDetail" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <TaskDetailScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskChat" 
                  options={{ 
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <TaskChatScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskProgress" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <TaskProgressScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="AreaManagement" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <AreaManagementScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="Notifications" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <NotificationsScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="AreaChiefDashboard" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <AreaChiefDashboard {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="Analytics" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <AnalyticsScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskReportsAndActivity" 
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <TaskReportsAndActivityScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="AdminReports" 
                  options={{ 
                    headerShown: false,
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <AdminReportsScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="MyAreaReports" 
                  options={{ 
                    headerShown: false,
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <MyAreaReportsScreen {...props} />
                    </Suspense>
                  )}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        </TasksProvider>
        </NotificationProvider>
        <Toast />
        {/* Vercel Analytics - Solo en web */}
        {Platform.OS === 'web' && Analytics && <Analytics />}
        {Platform.OS === 'web' && SpeedInsights && <SpeedInsights />}
            </MeshBackground>
          </GestureHandlerRootView>
        </ThemeProvider>
      </ErrorBoundary>
    </ImprovedErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9F2241',
    fontWeight: '600'
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    // backgroundColor y borderBottomColor se aplican inline con theme
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
    // color se aplica inline con theme.text
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
    minHeight: 44, // touch target mínimo
    minWidth: 44,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700'
    // color se aplica inline con theme.error
  }
});
