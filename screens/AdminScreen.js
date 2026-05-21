// screens/AdminScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, Alert, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import OverdueAlert from '../components/OverdueAlert';
import ShimmerEffect from '../components/ShimmerEffect';
import OrgChartEditor from '../components/OrgChartEditor';
import { toMs } from '../utils/dateUtils';
import { hapticMedium, hapticLight } from '../utils/haptics';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import { confirmAlert } from '../utils/alert';
import CreateUserForm from '../components/admin/CreateUserForm';
import PasswordResetForm from '../components/admin/PasswordResetForm';
import UserListPanel from '../components/admin/UserListPanel';

const TABS = [
  { id: 'resumen',  label: 'Resumen',  icon: 'grid-outline'       },
  { id: 'usuarios', label: 'Usuarios', icon: 'people-outline'      },
  { id: 'areas',    label: 'Áreas',    icon: 'git-network-outline' },
  { id: 'sistema',  label: 'Sistema',  icon: 'settings-outline'    },
];

export default function AdminScreen({ navigation, onLogout }) {
  const { isDark, toggleTheme, theme } = useTheme();
  const { isDesktop } = useResponsive();
  const { tasks, currentUser } = useTasks();
  const isUserAdmin = currentUser?.role === 'admin';
  const { showError } = useNotification();

  const [activeTab, setActiveTab]                 = useState('resumen');
  const [notificationCount, setNotificationCount] = useState(0);
  const [allUsers, setAllUsers]                   = useState([]);
  const [showUrgentModal, setShowUrgentModal]     = useState(false);
  const [urgentTasks, setUrgentTasks]             = useState([]);
  const [isLoading, setIsLoading]                 = useState(true);
  const [showFlowModal, setShowFlowModal]         = useState(false);
  const [showOrgModal, setShowOrgModal]           = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadNotificationCount();
        await loadAllUsers();
      } catch {
        showError('Error al cargar datos de administración');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userCounts = useMemo(() => ({
    secretarios: allUsers.filter(u => u.role === 'secretario').length,
    directores:  allUsers.filter(u => u.role === 'director').length,
    operativos:  allUsers.filter(u => !['secretario', 'director', 'admin'].includes(u.role)).length,
    admins:      allUsers.filter(u => u.role === 'admin').length,
  }), [allUsers]);

  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    const urgent = tasks.filter(task => {
      if (task.status === 'cerrada' || !task.dueAt) return false;
      const timeLeft = toMs(task.dueAt) - now;
      return timeLeft > 0 && timeLeft < sixHours;
    });
    if (urgent.length > 0) {
      setUrgentTasks(urgent);
      setShowUrgentModal(true);
    }
  }, [tasks]);

  const loadNotificationCount = async () => {
    try {
      const notifications = await getAllScheduledNotifications();
      setNotificationCount(Array.isArray(notifications) ? notifications.length : 0);
    } catch {
      setNotificationCount(0);
    }
  };

  const loadAllUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) { setAllUsers([]); return; }
      setAllUsers(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date(),
        active: doc.data().active !== false,
      })));
    } catch {
      setAllUsers([]);
    }
  };

  const testNotification = async () => {
    try {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert('Permisos Denegados', 'Las notificaciones push no están disponibles en Expo Go.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Notificación de Prueba', body: 'Sistema TODO', data: { type: 'test' }, sound: true },
        trigger: { seconds: 2 },
      });
      Alert.alert('Programada', 'Recibirás una notificación en 2 segundos.');
      setTimeout(() => loadNotificationCount(), 100);
    } catch {
      Alert.alert('Info', 'Las notificaciones push no están disponibles en Expo Go.');
    }
  };

  const viewScheduledNotifications = async () => {
    const notifications = await getAllScheduledNotifications();
    if (notifications.length === 0) {
      Alert.alert('Sin Notificaciones', 'No hay notificaciones programadas');
    } else {
      Alert.alert(
        'Notificaciones Programadas',
        `Total: ${notifications.length}\n\n${notifications.slice(0, 5).map((n, i) =>
          `${i + 1}. ${n.content.title}`).join('\n')}${notifications.length > 5 ? `\n\n...y ${notifications.length - 5} más` : ''}`
      );
    }
  };

  const clearAllNotifications = () => {
    confirmAlert(
      'Confirmar',
      '¿Cancelar TODAS las notificaciones programadas?',
      async () => {
        await cancelAllNotifications();
        setNotificationCount(0);
        Alert.alert('Completado', 'Todas las notificaciones han sido canceladas');
      },
      'Sí, cancelar todo'
    );
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ShimmerEffect width="100%" height={110} borderRadius={0} style={{ marginBottom: 16 }} />
        <ShimmerEffect width="92%" height={40} borderRadius={12} style={{ marginHorizontal: 16, marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 }}>
          {[1, 2, 3].map(i => <ShimmerEffect key={i} width="30%" height={110} borderRadius={16} />)}
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 }}>
          {[1, 2, 3].map(i => <ShimmerEffect key={i} width="30%" height={110} borderRadius={16} />)}
        </View>
        {[1, 2, 3].map(i => (
          <ShimmerEffect key={i} width="92%" height={64} borderRadius={14} style={{ marginHorizontal: 16, marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  // --- No session ---
  if (!currentUser) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="alert-circle" size={60} color={theme.text} style={{ marginBottom: 16, opacity: 0.5 }} />
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 24 }}>No hay sesión activa</Text>
        <TouchableOpacity
          style={{ backgroundColor: theme.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
          onPress={() => { if (onLogout) onLogout(); }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Ir a Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Tab content helpers ---
  const statItems = [
    { icon: 'briefcase',        color: theme.primary,   count: userCounts.secretarios, label: 'Secretarios' },
    { icon: 'people',           color: theme.success,   count: userCounts.directores,  label: 'Directores'  },
    { icon: 'person-circle',    color: theme.textMuted, count: userCounts.operativos,  label: 'Otros'       },
    { icon: 'shield-checkmark', color: '#8B5CF6',       count: userCounts.admins,      label: 'Admins'      },
    { icon: 'notifications',    color: theme.warning,   count: notificationCount,      label: 'Alertas'     },
    { icon: 'people-circle',    color: theme.info,      count: allUsers.length,        label: 'Total'       },
  ];

  const quickActions = [
    {
      id: 'analytics',
      icon: 'analytics',
      color: theme.info,
      title: 'Analytics & Reportes',
      subtitle: 'Métricas globales del sistema',
      onPress: () => { hapticMedium(); navigation.navigate('Analytics'); },
    },
    {
      id: 'reports',
      icon: 'document-text',
      color: theme.warning,
      title: 'Reportes de Áreas',
      subtitle: 'Directores y secretarías',
      onPress: () => { hapticMedium(); navigation.navigate('AdminReports'); },
    },
    {
      id: 'flow',
      icon: 'git-network',
      color: theme.primary,
      title: 'Flujo del Sistema',
      subtitle: 'Roles, pantallas y guía de uso',
      onPress: () => { hapticMedium(); setShowFlowModal(true); },
    },
  ];

  const cardBg    = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const sepColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const GroupCard = ({ children, style }) => (
    <View style={[s.groupCard, { backgroundColor: cardBg, borderColor: cardBorder }, style]}>
      {children}
    </View>
  );

  const Separator = ({ indent = 68 }) => (
    <View style={[s.rowSeparator, { backgroundColor: sepColor, marginLeft: indent }]} />
  );

  const ActionRow = ({ icon, color, title, subtitle, onPress, right }) => (
    <TouchableOpacity style={s.actionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.actionIconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={s.actionText}>
        <Text style={[s.actionTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>{title}</Text>
        {subtitle ? <Text style={[s.actionSub, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />}
    </TouchableOpacity>
  );

  // --- Resumen tab ---
  const renderResumen = () => (
    <>
      <View style={s.statsGrid}>
        {statItems.map(item => (
          <View
            key={item.label}
            style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder, shadowColor: item.color }]}
          >
            <View style={[s.statAccent, { backgroundColor: item.color }]} />
            <View style={[s.statIconWrap, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[s.statNumber, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>{item.count}</Text>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.groupHeader, { color: theme.textSecondary }]}>ACCIONES RÁPIDAS</Text>
      <GroupCard>
        {quickActions.map((action, i) => (
          <View key={action.id}>
            <ActionRow {...action} />
            {i < quickActions.length - 1 && <Separator />}
          </View>
        ))}
      </GroupCard>
    </>
  );

  // --- Usuarios tab ---
  const renderUsuarios = () => (
    <>
      <CreateUserForm onUserCreated={loadAllUsers} isUserAdmin={isUserAdmin} />
      <UserListPanel allUsers={allUsers} currentUser={currentUser} onUsersChanged={loadAllUsers} />
      <PasswordResetForm isUserAdmin={isUserAdmin} />
    </>
  );

  // --- Areas tab ---
  const renderAreas = () => {
    const infoItems = [
      { icon: 'briefcase',    color: theme.primary, title: 'Secretarías',  value: '7 áreas registradas'       },
      { icon: 'people',       color: theme.success, title: 'Directores',         value: `${userCounts.directores} en total`  },
      { icon: 'person',       color: theme.info,    title: 'Secretarios',        value: `${userCounts.secretarios} activos`  },
    ];
    return (
      <>
        <Text style={[s.groupHeader, { color: theme.textSecondary }]}>ORGANIGRAMA MUNICIPAL</Text>
        <GroupCard>
          <ActionRow
            icon="folder-open"
            color={theme.primary}
            title="Gestión de Áreas"
            subtitle="Editar organigrama municipal"
            onPress={() => { hapticMedium(); setShowOrgModal(true); }}
          />
        </GroupCard>

        <Text style={[s.groupHeader, { color: theme.textSecondary }]}>ESTRUCTURA</Text>
        <GroupCard>
          {infoItems.map((item, i) => (
            <View key={item.title}>
              <View style={[s.actionRow, { paddingVertical: 14 }]}>
                <View style={[s.actionIconBox, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={[s.actionTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E', flex: 1 }]}>{item.title}</Text>
                <Text style={[s.actionSub, { color: theme.textSecondary }]}>{item.value}</Text>
              </View>
              {i < infoItems.length - 1 && <Separator />}
            </View>
          ))}
        </GroupCard>
      </>
    );
  };

  // --- Sistema tab ---
  const renderSistema = () => {
    const notifActions = [
      {
        icon: 'flask',  color: theme.success,
        title: 'Enviar Prueba',          subtitle: 'Notificación en 2 segundos',
        onPress: () => { hapticMedium(); testNotification(); },
      },
      {
        icon: 'list',   color: theme.info,
        title: `Ver Programadas`,         subtitle: `${notificationCount} en cola`,
        onPress: () => { hapticLight(); viewScheduledNotifications(); },
      },
      {
        icon: 'trash',  color: theme.error,
        title: 'Cancelar Todas',          subtitle: 'Borra las notificaciones pendientes',
        onPress: () => { hapticMedium(); clearAllNotifications(); },
      },
    ];

    return (
      <>
        <Text style={[s.groupHeader, { color: theme.textSecondary }]}>NOTIFICACIONES</Text>
        <GroupCard>
          {notifActions.map((item, i) => (
            <View key={item.title}>
              <ActionRow {...item} />
              {i < notifActions.length - 1 && <Separator />}
            </View>
          ))}
        </GroupCard>

        <Text style={[s.groupHeader, { color: theme.textSecondary }]}>INFORMACIÓN</Text>
        <GroupCard>
          {/* Version */}
          <View style={s.infoRow}>
            <Text style={[s.infoLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Versión</Text>
            <Text style={[s.infoValue, { color: theme.textSecondary }]}>1.0.0</Text>
          </View>
          <Separator indent={16} />

          {/* Firebase */}
          <View style={s.infoRow}>
            <Text style={[s.infoLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Firebase Auth</Text>
            <View style={[s.statusPill, { backgroundColor: theme.successAlpha }]}>
              <View style={[s.statusDot, { backgroundColor: theme.success }]} />
              <Text style={[s.statusPillText, { color: theme.successDark }]}>Activo</Text>
            </View>
          </View>
          <Separator indent={16} />

          {/* Firestore */}
          <View style={s.infoRow}>
            <Text style={[s.infoLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Firestore</Text>
            <View style={[s.statusPill, { backgroundColor: theme.successAlpha }]}>
              <View style={[s.statusDot, { backgroundColor: theme.success }]} />
              <Text style={[s.statusPillText, { color: theme.successDark }]}>Conectado</Text>
            </View>
          </View>
          <Separator indent={16} />

          {/* Dark mode toggle */}
          <View style={s.infoRow}>
            <Text style={[s.infoLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Modo Oscuro</Text>
            <TouchableOpacity
              style={[s.toggle, isDark && { backgroundColor: theme.primary }]}
              onPress={() => { hapticMedium(); toggleTheme(); }}
              activeOpacity={0.8}
            >
              <View style={[s.toggleKnob, isDark && s.toggleKnobOn]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={14} color={isDark ? '#FFF' : '#FFA500'} />
              </View>
            </TouchableOpacity>
          </View>
        </GroupCard>
      </>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen':  return renderResumen();
      case 'usuarios': return renderUsuarios();
      case 'areas':    return renderAreas();
      case 'sistema':  return renderSistema();
      default:         return renderResumen();
    }
  };

  // ============================================================
  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.wrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>

        {/* ── Urgent tasks modal ── */}
        <Modal visible={showUrgentModal} animationType="fade" transparent onRequestClose={() => setShowUrgentModal(false)}>
          <View style={s.overlay}>
            <View style={[s.modalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={[s.modalHeader, { borderBottomColor: sepColor }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="warning" size={26} color={theme.error} style={{ marginRight: 10 }} />
                  <View>
                    <Text style={[s.modalTitle, { color: isDark ? '#FFF' : '#1C1C1E' }]}>¡Alerta Urgente!</Text>
                    <Text style={[s.modalSub, { color: theme.textSecondary }]}>Tareas críticas próximas a vencer</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowUrgentModal(false)}>
                  <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360, padding: 16 }}>
                {urgentTasks.map(task => {
                  const timeLeft  = toMs(task.dueAt) - Date.now();
                  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                  const minsLeft  = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                  const critical  = hoursLeft < 2;
                  const accent    = critical ? theme.error : theme.warning;
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[s.urgentTask, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: accent }]}
                      onPress={() => { setShowUrgentModal(false); navigation.navigate('Home'); }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons name={critical ? 'alert-circle' : 'time'} size={22} color={accent} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFF' : '#1C1C1E' }} numberOfLines={2}>
                            {task.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                            {task.area} · {task.assignedTo}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: critical ? 'rgba(255,59,48,0.12)' : 'rgba(255,149,0,0.12)' }}>
                        <Ionicons name="hourglass" size={13} color={accent} />
                        <Text style={{ fontSize: 13, fontWeight: '700', marginLeft: 6, color: accent }}>
                          {hoursLeft}h {minsLeft}m restantes
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={{ padding: 16 }}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.error }]} onPress={() => setShowUrgentModal(false)}>
                  <Text style={s.modalBtnText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Flow modal ── */}
        <Modal visible={showFlowModal} animationType="slide" transparent onRequestClose={() => setShowFlowModal(false)}>
          <View style={s.overlay}>
            <View style={[s.flowModalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={[s.modalHeader, { borderBottomColor: sepColor }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[s.actionIconBox, { backgroundColor: theme.primary, marginRight: 10 }]}>
                    <Ionicons name="git-network" size={20} color="#FFF" />
                  </View>
                  <View>
                    <Text style={[s.modalTitle, { color: isDark ? '#FFF' : '#1C1C1E' }]}>Flujo del Sistema</Text>
                    <Text style={[s.modalSub, { color: theme.textSecondary }]}>Guía de funcionamiento</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowFlowModal(false)}>
                  <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                {/* Jerarquia */}
                <View style={[s.flowSection, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
                  <Text style={[s.flowSectionTitle, { color: isDark ? '#FFF' : '#1C1C1E' }]}>
                    \👥 Jerarquía de Roles
                  </Text>
                  <View style={{ alignItems: 'center' }}>
                    <View style={[s.roleBox, { backgroundColor: theme.error }]}>
                      <Ionicons name="shield-checkmark" size={15} color="#FFF" />
                      <Text style={s.roleBoxText}>ADMIN · Ve TODO</Text>
                    </View>
                    <Ionicons name="arrow-down" size={18} color={theme.textSecondary} style={{ marginVertical: 6 }} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {['SECRETARIO', 'SECRETARIO'].map((r, i) => (
                        <View key={i} style={[s.roleBoxSm, { backgroundColor: theme.primary }]}>
                          <Text style={s.roleBoxSmText}>{r}</Text>
                          <Text style={s.roleBoxSmDesc}>Ve su área</Text>
                        </View>
                      ))}
                    </View>
                    <Ionicons name="arrow-down" size={18} color={theme.textSecondary} style={{ marginVertical: 6 }} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {['DIRECTOR', 'DIRECTOR', 'DIRECTOR'].map((r, i) => (
                        <View key={i} style={[s.roleBoxSm, { backgroundColor: theme.info }]}>
                          <Text style={s.roleBoxSmText}>{r}</Text>
                          <Text style={s.roleBoxSmDesc}>Ve su área</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Flujo de tareas */}
                <View style={[s.flowSection, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
                  <Text style={[s.flowSectionTitle, { color: isDark ? '#FFF' : '#1C1C1E' }]}>
                    \📋 Flujo de Tareas
                  </Text>
                  {[
                    { n: '1', color: theme.primary,   title: 'Crear Tarea',      desc: 'Admin asigna a usuarios o área'      },
                    { n: '2', color: theme.warning,   title: 'Ver en Bandeja',   desc: 'Cada usuario ve sus tareas'           },
                    { n: '3', color: theme.info,      title: 'Ejecutar',         desc: 'Subtareas, chat, adjuntos'            },
                    { n: '4', color: theme.secondary, title: 'Confirmar Parte',  desc: 'Cada asignado confirma su trabajo'    },
                    { n: '5', color: theme.success,   title: 'Cerrar Tarea',     desc: 'Admin cierra cuando todos confirman' },
                  ].map((step, i) => (
                    <View key={step.n}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[s.stepBubble, { backgroundColor: step.color }]}>
                          <Text style={s.stepNum}>{step.n}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#1C1C1E' }}>{step.title}</Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>{step.desc}</Text>
                        </View>
                      </View>
                      {i < 4 && <View style={{ width: 2, height: 12, backgroundColor: theme.border, marginLeft: 14, marginVertical: 2 }} />}
                    </View>
                  ))}
                </View>

                {/* Credenciales */}
                <View style={[s.flowSection, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
                  <Text style={[s.flowSectionTitle, { color: isDark ? '#FFF' : '#1C1C1E' }]}>
                    \🔐 Credenciales de Acceso
                  </Text>
                  {[
                    {
                      header: '\👤 ADMINISTRADOR', color: theme.primary,
                      items: ['admin@todo.com → admin123'],
                    },
                    {
                      header: '\📋 SECRETARIOS', color: theme.info,
                      items: [
                        'secretaria.general@municipio.com → SecGen2024',
                        'tesoreria@municipio.com → Teso2024',
                        'obras.publicas@municipio.com → Obras2024',
                        'planeacion@municipio.com → Plan2024',
                        'desarrollo.economico@municipio.com → DesEco2024',
                        'bienestar.social@municipio.com → Bien2024',
                        'seguridad.publica@municipio.com → Seg2024',
                        'pueblos.indigenas@municipio.com → Pueblos2024',
                      ],
                    },
                    {
                      header: '\🏢 DIRECTORES — Contraseña: Dir2024', color: theme.success,
                      items: [
                        'amalia.escalante@municipio.com', 'jose.angeles@municipio.com',
                        'brenda.martinez@municipio.com', 'ernesto.espinoza@municipio.com',
                        'gerardo.mendoza@municipio.com', 'dulce.rosas@municipio.com',
                        'alejandro.diaz@municipio.com', 'miguel.tolentino@municipio.com',
                        'vanessa.martinez@municipio.com', 'berenice.moreno@municipio.com',
                        'hipolito.bartolo@municipio.com', 'marcelino.capula@municipio.com',
                      ],
                    },
                  ].map(group => (
                    <View key={group.header} style={[s.credBox, { borderColor: group.color + '30', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                      <Text style={[s.credHeader, { color: group.color }]}>{group.header}</Text>
                      {group.items.map(item => (
                        <Text key={item} style={[s.credItem, { color: isDark ? 'rgba(255,255,255,0.72)' : '#555' }]}>{item}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={{ padding: 16 }}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.primary }]} onPress={() => setShowFlowModal(false)}>
                  <Text style={s.modalBtnText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Header ── */}
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={s.header}
        >
          <View style={s.headerHighlight} />
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerGreeting}>
                {currentUser?.displayName ? `Hola, ${currentUser.displayName.split(' ')[0]}` : 'Hola!'}
              </Text>
              <Text style={s.headerTitle}>Administración</Text>
            </View>
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={() => {
                hapticMedium();
                confirmAlert(
                  'Cerrar Sesión',
                  '¿Estás seguro que deseas cerrar sesión?',
                  async () => { if (onLogout) await onLogout(); },
                  'Cerrar Sesión'
                );
              }}
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Tab bar ── */}
        <View style={[s.tabBar, { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : '#FFFFFF', borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={s.tabItem}
                onPress={() => { hapticLight(); setActiveTab(tab.id); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? tab.icon.replace('-outline', '') : tab.icon}
                  size={20}
                  color={active ? theme.primary : theme.textMuted}
                />
                <Text style={[s.tabLabel, { color: active ? theme.primary : theme.textMuted, fontWeight: active ? '700' : '500' }]}>
                  {tab.label}
                </Text>
                {active && <View style={[s.tabIndicator, { backgroundColor: theme.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <OverdueAlert tasks={[]} currentUserEmail={currentUser?.email} role={currentUser?.role} />

        {/* ── Tab content ── */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderTabContent()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Org chart modal ── */}
        <Modal visible={showOrgModal} animationType="slide" transparent={false} onRequestClose={() => setShowOrgModal(false)}>
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <LinearGradient
              colors={theme.gradientHeader}
              style={{ paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
            >
              <TouchableOpacity onPress={() => setShowOrgModal(false)} style={{ marginRight: 12, padding: 4 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Organigrama Municipal</Text>
                <Text style={{ color: 'rgba(254,202,202,0.9)', fontSize: 11, marginTop: 1 }}>
                  Cambios guardados en tiempo real
                </Text>
              </View>
              <Ionicons name="git-network" size={22} color="rgba(254,202,202,0.9)" />
            </LinearGradient>
            <OrgChartEditor />
          </View>
        </Modal>

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center' },
  wrapper: { flex: 1, width: '100%', alignSelf: 'center' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  headerHighlight: {
    position: 'absolute', top: 0, left: 30, right: 30, height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 1,
  },
  headerRow:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerGreeting: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.3, marginBottom: 2 },
  headerTitle:   { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  tabItem:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3, position: 'relative' },
  tabLabel:     { fontSize: 10, letterSpacing: 0.2 },
  tabIndicator: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2.5, borderRadius: 2 },

  // Content
  content: { padding: 16, paddingBottom: 80 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    width: '31%', flexGrow: 1, borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 4,
    overflow: 'hidden', position: 'relative',
  },
  statAccent:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  statNumber:   { fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 32 },
  statLabel:    { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center', letterSpacing: 0.3, textTransform: 'uppercase' },

  // Group sections
  groupHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  groupCard: {
    borderRadius: 16, borderWidth: 1, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  actionRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  actionIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  actionText:   { flex: 1 },
  actionTitle:  { fontSize: 15, fontWeight: '600' },
  actionSub:    { fontSize: 12, marginTop: 1 },
  rowSeparator: { height: StyleSheet.hairlineWidth },

  // Info rows (Sistema tab)
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  infoLabel:     { fontSize: 15, fontWeight: '500' },
  infoValue:     { fontSize: 15 },
  statusPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot:     { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  toggle: {
    width: 52, height: 30, borderRadius: 15, backgroundColor: 'rgba(120,120,128,0.22)', padding: 2, justifyContent: 'center',
  },
  toggleKnob: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },

  // Modals shared
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: {
    width: '100%', maxWidth: 420, maxHeight: '85%', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },
  flowModalCard: {
    width: '100%', maxWidth: 440, flex: 1, maxHeight: '92%', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle:   { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  modalSub:     { fontSize: 13, marginTop: 1 },
  urgentTask:   { padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 2 },
  modalBtn:     { padding: 15, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Flow modal internals
  flowSection:      { borderRadius: 14, padding: 16, marginBottom: 14 },
  flowSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  roleBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  roleBoxText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  roleBoxSm:   { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, minWidth: 88 },
  roleBoxSmText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  roleBoxSmDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 },
  stepBubble: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNum:    { color: '#FFF', fontSize: 13, fontWeight: '800' },
  credBox:    { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  credHeader: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  credItem:   { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', paddingVertical: 2, lineHeight: 17 },
});
