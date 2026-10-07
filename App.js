// App.js - VERSIÓN COMPLETA CON TABS - Compatible con web
import './polyfills'; // Debe ser lo primero
import 'react-native-gesture-handler';

// Filtrar ruido conocido de librerías en web (aplica siempre, dev y prod).
// Solo avisos de react-native-web / reanimated que no se pueden corregir en la app:
// nada genérico como "CORS", que escondería errores reales de red.
const originalError = console.error;
const originalWarn  = console.warn;
const NOISE_PATTERNS = [
  'transform-origin',
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

import React, { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import { NavigationContainer, getPathFromState as defaultGetPathFromState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TasksProvider, useTasks } from './contexts/TasksContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { getGestureHandlerRootView } from './utils/platformComponents';
import PremiumTabBar from './components/PremiumTabBar';
import DesktopSidebar from './components/DesktopSidebar';
import { useResponsive } from './utils/responsive';
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
const MoreScreen = React.lazy(() => import('./screens/MoreScreen'));
const TaskDetailScreen = React.lazy(() => import('./screens/TaskDetailScreen'));
const TaskChatScreen = React.lazy(() => import('./screens/TaskChatScreen'));
const TaskProgressScreen = React.lazy(() => import('./screens/TaskProgressScreen'));
const ReportsScreen = React.lazy(() => import('./screens/ReportsScreen'));
const NotificationsScreen = React.lazy(() => import('./screens/NotificationsScreen'));
const AreaChiefDashboard = React.lazy(() => import('./screens/AreaChiefDashboard'));
const AreaManagementScreen = React.lazy(() => import('./screens/area/AreaManagementScreen'));
const AnalyticsScreen = React.lazy(() => import('./screens/AnalyticsScreen'));
const TaskReportsAndActivityScreen = React.lazy(() => import('./screens/TaskReportsAndActivityScreen'));
const ProfileScreen = React.lazy(() => import('./screens/ProfileScreen'));
const SearchScreen = React.lazy(() => import('./screens/SearchScreen'));
const SettingsScreen = React.lazy(() => import('./screens/SettingsScreen'));
const TrashScreen = React.lazy(() => import('./screens/TrashScreen'));
import { toMs } from './utils/dateUtils';
import { isClosed } from './utils/taskStatus';
import { ensurePermissions, setupNotificationResponseListener } from './services/notifications';
import { initConnectionListener } from './services/offlineSync';
import { startOrgStructureSync } from './services/orgStructure';
import ConnectionStatus from './components/ConnectionStatus';
import DialogHost from './components/DialogHost';
import NotificationWatcher from './components/NotificationWatcher';
import AnimatedSplash from './components/AnimatedSplash';
import ImprovedErrorBoundary from './components/ImprovedErrorBoundary';
import { startAutoCacheCleanup, stopAutoCacheCleanup } from './utils/cacheManager';
import logger from './services/Logger';

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

const APP_NAME = 'Gestión';

// Direcciones en web: cada pantalla tiene su URL, así se puede compartir el enlace
// a una tarea y el botón "atrás" del navegador funciona.
const linking = {
  prefixes: [],
  enabled: Platform.OS === 'web',
  config: {
    // Al abrir un enlace directo (p. ej. /tarea/abc) las pestañas quedan debajo,
    // para que "volver" tenga a dónde regresar
    initialRouteName: 'Main',
    screens: {
      Login: 'login',
      Main: {
        path: '',
        screens: {
          Home: '',
          Kanban: 'tablero',
          Calendar: 'calendario',
          Inbox: 'bandeja',
          More: 'mas',
          Reports: 'reportes',
          SecretarioDashboard: 'panel',
          ExecutiveDashboard: 'dashboard',
          Admin: 'administracion',
        },
      },
      TaskDetail: 'tarea/:taskId?',
      TaskChat: 'tarea/:taskId/chat',
      TaskProgress: 'tarea/:taskId/avance',
      TaskReportsAndActivity: 'tarea/:taskId/reportes',
      Notifications: 'notificaciones',
      Profile: 'perfil',
      Settings: 'configuracion',
      Search: 'buscar',
      Trash: 'papelera',
      Analytics: 'analiticas',
      AdminReports: 'reportes-generales',
      MyAreaReports: 'reportes-area',
      AreaManagement: 'areas',
      AreaChiefDashboard: 'panel-area',
    },
  },
  // Los parámetros que no forman parte de la ruta (el objeto de la tarea, títulos)
  // no se escriben en la URL: se resuelven con el identificador al abrir el enlace.
  getPathFromState: (state, options) => defaultGetPathFromState(state, options).split('?')[0],
};

const documentTitle = {
  formatter: (options) => (options?.title ? `${options.title} · ${APP_NAME}` : APP_NAME),
};

// 🔄 Componente de carga para lazy-loaded screens
function ScreenFallback() {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.centered, { backgroundColor: theme.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
    >
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

// Envuelve una pantalla cargada bajo demanda. Se crea una sola vez por pantalla
// (fuera del render) para que React Navigation no la vuelva a montar en cada cambio.
const lazyScreen = (Component) => function LazyScreen(props) {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Component {...props} />
    </Suspense>
  );
};

const Screens = {
  Kanban: lazyScreen(KanbanScreen),
  Calendar: lazyScreen(CalendarScreen),
  Inbox: lazyScreen(MyInboxScreen),
  Reports: lazyScreen(ReportsScreen),
  SecretarioDashboard: lazyScreen(SecretarioDashboardScreen),
  ExecutiveDashboard: lazyScreen(AdminExecutiveDashboard),
  TaskChat: lazyScreen(TaskChatScreen),
  TaskProgress: lazyScreen(TaskProgressScreen),
  AreaManagement: lazyScreen(AreaManagementScreen),
  Notifications: lazyScreen(NotificationsScreen),
  AreaChiefDashboard: lazyScreen(AreaChiefDashboard),
  Analytics: lazyScreen(AnalyticsScreen),
  TaskReportsAndActivity: lazyScreen(TaskReportsAndActivityScreen),
  AdminReports: lazyScreen(AdminReportsScreen),
  MyAreaReports: lazyScreen(MyAreaReportsScreen),
  Search: lazyScreen(SearchScreen),
  Trash: lazyScreen(TrashScreen),
};

// Detalle de tarea. Acepta la tarea completa (navegación dentro de la app) o solo su
// identificador (enlace en web / recarga de página): en ese caso espera a que las
// tareas del usuario estén cargadas y la busca ahí.
function TaskDetailRoute(props) {
  const { theme } = useTheme();
  const { tasks, isLoading } = useTasks();
  const { route, navigation } = props;
  const { task, taskId } = route.params || {};
  const needsLookup = !task && !!taskId;

  // Se resuelve una sola vez por tarea: el formulario no debe reiniciarse con cada
  // actualización en tiempo real (TaskDetailScreen ya sigue los cambios por su cuenta)
  const resolvedRef = useRef(null);
  if (needsLookup && resolvedRef.current?.id !== taskId) {
    resolvedRef.current = tasks.find(t => t.id === taskId) || null;
  }
  const resolved = needsLookup ? resolvedRef.current : null;

  const resolvedRoute = useMemo(
    () => (resolved ? { ...route, params: { ...route.params, task: resolved } } : route),
    [route, resolved]
  );

  if (needsLookup && !resolved) {
    if (isLoading) return <ScreenFallback />;
    return (
      <View style={[styles.centered, { backgroundColor: theme.background, padding: 24 }]}>
        <Ionicons name="document-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.notFoundTitle, { color: theme.text }]}>No se encontró la tarea</Text>
        <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
          Puede que se haya eliminado o que ya no esté asignada a ti.
        </Text>
        <TouchableOpacity
          style={[styles.notFoundButton, { backgroundColor: theme.primary }]}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
          accessibilityRole="button"
        >
          <Text style={[styles.notFoundButtonText, { color: theme.buttonPrimaryText }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Suspense fallback={<ScreenFallback />}>
      <TaskDetailScreen {...props} route={resolvedRoute} />
    </Suspense>
  );
}

// Tab Navigator con todas las pantallas
function MainTabs({ onLogout, navigation }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks: contextTasks } = useTasks();
  const { user: currentUser, isAdmin, isSecretario, isDirector } = useAuth();
  const { isDesktop, isTablet } = useResponsive();
  const usesSidebar = isDesktop || isTablet;
  const tabNavRef = useRef(null);
  const [activeRouteName, setActiveRouteName] = useState('Home');

  // Notificaciones locales y push: una vez por usuario
  const userId = currentUser?.userId;
  useEffect(() => {
    if (!userId) return undefined;

    ensurePermissions().catch(console.error);

    const { registerPushToken, setupPushNotificationListener } = require('./services/pushNotifications');
    registerPushToken(userId).catch((err) => {
      console.warn('Push token registration skipped (non-critical):', err.message);
    });

    const unsubscribePush = setupPushNotificationListener((notification) => {
      Toast.show({
        type: 'success',
        text1: notification.title,
        text2: notification.body,
        position: 'top'
      });
    });
    return () => unsubscribePush?.();
  }, [userId]);

  // Badges de vencidas/urgentes desde el context (ya filtrado por rol)
  const { overdueCount, urgentCount } = useMemo(() => {
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;
    const open = contextTasks.filter(t => !isClosed(t.status));
    return {
      overdueCount: open.filter(t => toMs(t.dueAt) < now).length,
      // Vencidas + las que vencen en menos de 24 h
      urgentCount: open.filter(t => toMs(t.dueAt) < tomorrow).length,
    };
  }, [contextTasks]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      const Notifications = require('expo-notifications');
      Notifications.default?.setBadgeCountAsync(overdueCount).catch(() => {});
    } catch {
      // no-op
    }
  }, [overdueCount]);

  const canSeeReports = isAdmin || isSecretario || isDirector;

  // Rutas del sidebar según el rol. "Más" solo existe en la barra del celular:
  // en pantallas anchas todo está a la vista en la barra lateral.
  const sidebarRoutes = useMemo(() => {
    const routes = [
      { name: 'Home' },
      { name: 'Kanban' },
      { name: 'Calendar' },
      { name: 'Inbox' },
    ];
    if (canSeeReports) routes.push({ name: 'Reports' });
    if (isSecretario) routes.push({ name: 'SecretarioDashboard' });
    // El panel del director no es una pestaña: se abre encima, como en el celular
    if (isDirector) routes.push({ name: 'AreaChiefDashboard', stack: true });
    if (isAdmin) routes.push({ name: 'ExecutiveDashboard' });
    if (isAdmin) routes.push({ name: 'Admin' });
    return routes;
  }, [isAdmin, isSecretario, isDirector, canSeeReports]);

  const badgeStyle = (backgroundColor) => ({
    backgroundColor,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.card,
  });

  return (
    <View style={{ flex: 1, flexDirection: usesSidebar ? 'row' : 'column' }}>
      {/* Sidebar — solo tablet/desktop */}
      {usesSidebar && (
        <DesktopSidebar
          routes={sidebarRoutes}
          activeRouteName={activeRouteName}
          onNavigate={(name) => tabNavRef.current?.navigate(name)}
          currentUser={currentUser}
          overdueCount={overdueCount}
          urgentCount={urgentCount}
          onLogout={onLogout}
          stackNavigation={navigation}
        />
      )}
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          tabBar={(props) => {
            tabNavRef.current = props.navigation;
            if (usesSidebar) return null;
            return <PremiumTabBar {...props} isDark={isDark} insets={insets} />;
          }}
          screenListeners={({ route }) => ({
            focus: () => setActiveRouteName(route.name),
          })}
          screenOptions={{ headerShown: false }}
        >
          {/* Las cinco pestañas de la barra inferior */}
          <Tab.Screen
            name="Home"
            options={{
              title: 'Inicio',
              tabBarBadge: urgentCount > 0 ? urgentCount : undefined,
              tabBarBadgeStyle: badgeStyle(urgentCount > 3 ? theme.error : theme.warningSolid),
            }}
          >
            {(props) => (
              <Suspense fallback={<ScreenFallback />}>
                <HomeScreen {...props} onLogout={onLogout} />
              </Suspense>
            )}
          </Tab.Screen>
          <Tab.Screen name="Kanban" options={{ title: 'Tablero' }} component={Screens.Kanban} />
          <Tab.Screen name="Calendar" options={{ title: 'Calendario' }} component={Screens.Calendar} />
          <Tab.Screen
            name="Inbox"
            options={{
              title: 'Bandeja',
              tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
              tabBarBadgeStyle: badgeStyle(theme.error),
            }}
            component={Screens.Inbox}
          />
          <Tab.Screen name="More" options={{ title: 'Más' }}>
            {(props) => (
              <Suspense fallback={<ScreenFallback />}>
                <MoreScreen {...props} onLogout={onLogout} />
              </Suspense>
            )}
          </Tab.Screen>

          {/* Se abren desde "Más" en el celular y desde la barra lateral en escritorio */}
          {canSeeReports && (
            <Tab.Screen name="Reports" options={{ title: 'Reportes' }} component={Screens.Reports} />
          )}
          {isSecretario && (
            <Tab.Screen
              name="SecretarioDashboard"
              options={{ title: 'Panel de mi secretaría' }}
              component={Screens.SecretarioDashboard}
            />
          )}
          {isAdmin && (
            <Tab.Screen
              name="ExecutiveDashboard"
              options={{ title: 'Panel ejecutivo' }}
              component={Screens.ExecutiveDashboard}
            />
          )}
          {isAdmin && (
            <Tab.Screen name="Admin" options={{ title: 'Administración' }}>
              {(props) => (
                <Suspense fallback={<ScreenFallback />}>
                  <AdminScreen {...props} onLogout={onLogout} />
                </Suspense>
              )}
            </Tab.Screen>
          )}
        </Tab.Navigator>
      </View>
    </View>
  );
}

const REVOKED_MESSAGES = {
  disabled: 'Tu cuenta fue desactivada. Contacta al administrador.',
  deleted: 'Tu cuenta ya no existe. Contacta al administrador.',
  'permission-denied': 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
};

const cardScreen = { presentation: 'card', animation: 'slide_from_right' };

// Navegación de la app. La pantalla de inicio de sesión y las pantallas internas se
// alternan según el estado de AuthContext: no hace falta reiniciar el árbol a mano.
function AppNavigator({ navigationRef }) {
  const { isAuthenticated, reload, signOut, revokedReason } = useAuth();

  const handleLogout = async () => {
    // Antes de cerrar la sesión (después ya no hay permiso para escribir): este
    // dispositivo deja de recibir los avisos de la cuenta. Solo aplica en la app nativa.
    if (Platform.OS !== 'web') {
      const { unregisterPushToken } = require('./services/pushNotifications');
      await unregisterPushToken();
    }
    await signOut();
    Toast.show({ type: 'success', text1: 'Sesión cerrada', position: 'top' });
  };

  // Organigrama vigente: lo que el administrador edita se aplica a permisos y selectores
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return startOrgStructureSync();
  }, [isAuthenticated]);

  // El servidor cerró la sesión (cuenta desactivada o eliminada): explicar por qué
  useEffect(() => {
    if (!revokedReason) return;
    Toast.show({
      type: 'error',
      text1: 'Sesión cerrada',
      text2: REVOKED_MESSAGES[revokedReason] || REVOKED_MESSAGES['permission-denied'],
      position: 'top',
      visibilityTime: 6000,
    });
  }, [revokedReason]);

  return (
    <NotificationProvider>
      <TasksProvider>
        {/* Campana en tiempo real y aviso al llegar una notificación */}
        <NotificationWatcher />
        {isAuthenticated && <ConnectionStatus />}
        <NavigationContainer ref={navigationRef} linking={linking} documentTitle={documentTitle}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
              animationDuration: Platform.OS === 'web' ? 300 : 400,
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen name="Login" options={{ animation: 'fade', title: 'Iniciar sesión' }}>
                {(props) => (
                  <Suspense fallback={<ScreenFallback />}>
                    <LoginScreen {...props} onLogin={reload} />
                  </Suspense>
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Main" options={{ animation: 'fade' }}>
                  {(props) => <MainTabs {...props} onLogout={handleLogout} />}
                </Stack.Screen>
                <Stack.Screen name="TaskDetail" options={{ ...cardScreen, title: 'Tarea' }} component={TaskDetailRoute} />
                <Stack.Screen
                  name="TaskChat"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom', title: 'Chat de la tarea' }}
                  component={Screens.TaskChat}
                />
                <Stack.Screen name="TaskProgress" options={{ ...cardScreen, title: 'Avance' }} component={Screens.TaskProgress} />
                <Stack.Screen name="AreaManagement" options={{ ...cardScreen, title: 'Áreas' }} component={Screens.AreaManagement} />
                <Stack.Screen name="Notifications" options={{ ...cardScreen, title: 'Notificaciones' }} component={Screens.Notifications} />
                <Stack.Screen name="AreaChiefDashboard" options={{ ...cardScreen, title: 'Panel del área' }} component={Screens.AreaChiefDashboard} />
                <Stack.Screen name="Analytics" options={{ ...cardScreen, title: 'Analíticas' }} component={Screens.Analytics} />
                <Stack.Screen
                  name="TaskReportsAndActivity"
                  options={{ ...cardScreen, title: 'Reportes de la tarea' }}
                  component={Screens.TaskReportsAndActivity}
                />
                <Stack.Screen name="AdminReports" options={{ ...cardScreen, title: 'Reportes generales' }} component={Screens.AdminReports} />
                <Stack.Screen name="MyAreaReports" options={{ ...cardScreen, title: 'Reportes de mi área' }} component={Screens.MyAreaReports} />
                <Stack.Screen name="Profile" options={{ ...cardScreen, title: 'Mi perfil' }}>
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <ProfileScreen {...props} onLogout={handleLogout} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen name="Search" options={{ ...cardScreen, title: 'Buscar' }} component={Screens.Search} />
                <Stack.Screen name="Settings" options={{ ...cardScreen, title: 'Configuración' }}>
                  {(props) => (
                    <Suspense fallback={<ScreenFallback />}>
                      <SettingsScreen {...props} onLogout={handleLogout} />
                    </Suspense>
                  )}
                </Stack.Screen>
                <Stack.Screen name="Trash" options={{ ...cardScreen, title: 'Papelera' }} component={Screens.Trash} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </TasksProvider>
    </NotificationProvider>
  );
}

// La app se dibuja debajo de la pantalla de inicio animada, que se desvanece
// cuando la sesión ya se restauró.
function AppShell({ navigationRef }) {
  const { isLoading } = useAuth();
  // Pantalla de inicio animada: solo al abrir la app, no al cerrar o iniciar sesión
  const [splashVisible, setSplashVisible] = useState(true);
  // Tope de seguridad: si restaurar la sesión tarda, se muestra la app de todos modos
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timeout);
  }, []);
  const ready = !isLoading || timedOut;

  return (
    <View style={{ flex: 1 }}>
      {ready && (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <MeshBackground>
            <AppNavigator navigationRef={navigationRef} />
            <Toast />
            {/* Confirmaciones y avisos con el diseño de la app (utils/alert.js) */}
            <DialogHost />
            {/* Vercel Analytics - Solo en web */}
            {Platform.OS === 'web' && Analytics && <Analytics />}
            {Platform.OS === 'web' && SpeedInsights && <SpeedInsights />}
          </MeshBackground>
        </GestureHandlerRootView>
      )}
      {splashVisible && (
        <AnimatedSplash ready={ready} onFinish={() => setSplashVisible(false)} />
      )}
    </View>
  );
}

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // 🚀 Inicializar logger de producción
    logger.info('App', 'App starting');
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

    // 🌐 Inicializar listener de conexión para sincronización offline-first
    const unsubscribeConnection = initConnectionListener();

    // 🔔 Setup del listener de respuestas de notificaciones
    const notificationSubscription = setupNotificationResponseListener();

    return () => {
      if (unsubscribeConnection) unsubscribeConnection();
      if (notificationSubscription) notificationSubscription.remove();
      stopAutoCacheCleanup();
    };
  }, []);

  return (
    <ThemeProvider>
      <ImprovedErrorBoundary navigation={navigationRef}>
        {/* Márgenes seguros para lo que se dibuja fuera de los navegadores (ConnectionStatus) */}
        <SafeAreaProvider>
          <AuthProvider>
            <AppShell navigationRef={navigationRef} />
          </AuthProvider>
        </SafeAreaProvider>
      </ImprovedErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
  notFoundButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
  },
  notFoundButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
