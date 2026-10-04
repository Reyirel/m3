// components/admin/OrgDiagramBoard.js
// Diagrama del organigrama con arrastrar y soltar.
//
// Cada secretaría es una columna y cada dirección una ficha. Una ficha se puede:
//   - arrastrar a otra columna para cambiarla de secretaría
//   - arrastrar dentro de su columna para cambiar el orden
//   - tocar para elegir la secretaría de destino en una lista (misma acción sin arrastrar,
//     útil en pantallas pequeñas y con lector de pantalla)
// Cada columna tiene botones para cambiar la secretaría de lugar, renombrarla o eliminarla,
// y al final hay una columna para agregar otra.
// El diagrama solo decide qué se cambia; guardar y aplicar el cambio a usuarios y tareas
// lo hace quien lo usa, a través de `onMove` y los `on…Secretaria`.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  PanResponder, Animated, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, TOUCH_TARGET } from '../../theme/tokens';

const COL_WIDTH = 190;
const COL_GAP = 10;
const COLS_PADDING = 12;
// Distancia al borde a partir de la cual el diagrama se desplaza solo mientras se arrastra
const EDGE_SCROLL_ZONE = 56;
const EDGE_SCROLL_STEP = 14;
// Menos que esto se considera un toque, no un arrastre
const TAP_SLOP = 6;

// Con ratón se arrastra la ficha entera. Con el dedo, solo desde el asa:
// así tocar una ficha no impide desplazar la lista.
const HAS_FINE_POINTER = Platform.OS === 'web'
  && typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(pointer: fine)').matches;

const webOnly = (style) => (Platform.OS === 'web' ? style : null);

function DireccionChip({ name, disabled, dragging, theme, onPress, dragHandlers, registerRef }) {
  const panRef = useRef(null);
  const handlersRef = useRef(dragHandlers);
  handlersRef.current = dragHandlers;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  if (!panRef.current) {
    let moved = false;
    panRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        moved = false;
        handlersRef.current.onStart(event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderMove: (event, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > TAP_SLOP) moved = true;
        handlersRef.current.onMove(gesture.moveX || event.nativeEvent.pageX, gesture.moveY || event.nativeEvent.pageY);
      },
      onPanResponderRelease: () => handlersRef.current.onEnd(moved),
      onPanResponderTerminate: () => handlersRef.current.onCancel(),
    });
  }

  const chipPan = HAS_FINE_POINTER ? panRef.current.panHandlers : {};
  const handlePan = HAS_FINE_POINTER ? {} : panRef.current.panHandlers;

  return (
    <View
      ref={registerRef}
      collapsable={false}
      style={[
        styles.chip,
        { backgroundColor: theme.card, borderColor: theme.glassBorderStrong },
        dragging && { opacity: 0.35 },
        webOnly({ userSelect: 'none', cursor: disabled ? 'default' : HAS_FINE_POINTER ? 'grab' : 'pointer' }),
      ]}
      {...chipPan}
    >
      <View
        style={[styles.chipHandle, webOnly({ touchAction: 'none' })]}
        {...handlePan}
        accessible={false}
      >
        <Ionicons name="reorder-two" size={18} color={theme.textTertiary} />
      </View>
      {HAS_FINE_POINTER ? (
        // Con ratón el toque se resuelve al soltar (onEnd sin movimiento)
        <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={3}>{name}</Text>
      ) : (
        <TouchableOpacity
          style={styles.chipBody}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${name}. Mover a otra secretaría`}
        >
          <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={3}>{name}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function OrgDiagramBoard({
  orgData, theme, busy = false, onMove,
  onMoveSecretaria, onRenameSecretaria, onRemoveSecretaria, onAddSecretaria,
}) {
  const secretarias = orgData.secretarias;

  // drag: { direccion, secIdx, dirIdx } mientras se arrastra una ficha
  const [drag, setDrag] = useState(null);
  // drop: { secIdx, index } columna y posición donde caería
  const [drop, setDrop] = useState(null);
  // Dirección para la que se muestra la lista "Mover a…"
  const [picker, setPicker] = useState(null);

  const rootRef = useRef(null);
  const hScrollRef = useRef(null);
  const hWrapRef = useRef(null);
  const chipRefs = useRef(new Map());
  const ghost = useRef(new Animated.ValueXY()).current;

  // Medidas tomadas al empezar a arrastrar (coordenadas de ventana)
  const rootOrigin = useRef({ x: 0, y: 0 });
  const hScrollWin = useRef({ x: 0, width: 0 });
  const chipCenters = useRef(new Map());
  const scrollX = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const edgeDirection = useRef(0);
  const edgeTimer = useRef(null);

  const stopEdgeScroll = useCallback(() => {
    if (edgeTimer.current) clearInterval(edgeTimer.current);
    edgeTimer.current = null;
    edgeDirection.current = 0;
  }, []);

  useEffect(() => stopEdgeScroll, [stopEdgeScroll]);

  // Una columna más: la de "Agregar secretaría"
  const maxScrollX = Math.max(
    0,
    COLS_PADDING * 2 + (secretarias.length + 1) * COL_WIDTH + secretarias.length * COL_GAP - hScrollWin.current.width
  );

  // Columna y posición bajo el puntero
  const updateDrop = useCallback(() => {
    const { x, y } = pointer.current;
    const win = hScrollWin.current;
    let next = null;
    if (x >= win.x && x <= win.x + win.width) {
      const contentX = x - win.x + scrollX.current - COLS_PADDING;
      const secIdx = Math.floor(contentX / (COL_WIDTH + COL_GAP));
      const insideColumn = contentX - secIdx * (COL_WIDTH + COL_GAP) <= COL_WIDTH;
      if (secIdx >= 0 && secIdx < secretarias.length && insideColumn) {
        // Posición: cuántas fichas de esa columna quedan por encima del puntero
        let index = 0;
        secretarias[secIdx].direcciones.forEach((_, dirIdx) => {
          const centerY = chipCenters.current.get(`${secIdx}:${dirIdx}`);
          if (centerY !== undefined && y > centerY) index = dirIdx + 1;
        });
        next = { secIdx, index };
      }
    }
    const prev = dropRef.current;
    if (prev?.secIdx !== next?.secIdx || prev?.index !== next?.index) {
      dropRef.current = next;
      setDrop(next);
    }
  }, [secretarias]);

  const moveGhost = useCallback(() => {
    ghost.setValue({
      x: pointer.current.x - rootOrigin.current.x - COL_WIDTH / 2,
      y: pointer.current.y - rootOrigin.current.y - 18,
    });
  }, [ghost]);

  const startEdgeScroll = useCallback((direction) => {
    if (edgeDirection.current === direction) return;
    stopEdgeScroll();
    if (!direction) return;
    edgeDirection.current = direction;
    edgeTimer.current = setInterval(() => {
      const target = Math.max(0, Math.min(maxScrollX, scrollX.current + direction * EDGE_SCROLL_STEP));
      if (target === scrollX.current) return;
      scrollX.current = target;
      hScrollRef.current?.scrollTo({ x: target, animated: false });
      updateDrop();
    }, 16);
  }, [maxScrollX, stopEdgeScroll, updateDrop]);

  const endDrag = useCallback(() => {
    stopEdgeScroll();
    dragRef.current = null;
    dropRef.current = null;
    setDrag(null);
    setDrop(null);
  }, [stopEdgeScroll]);

  const requestMove = useCallback((direccion, fromSecIdx, toSecIdx, index) => {
    const from = secretarias[fromSecIdx];
    const to = secretarias[toSecIdx];
    if (!from || !to) return;
    onMove({ direccion, fromSecretaria: from.nombre, toSecretaria: to.nombre, toIndex: index });
  }, [secretarias, onMove]);

  const dragHandlersFor = (direccion, secIdx, dirIdx) => ({
    onStart: (pageX, pageY) => {
      pointer.current = { x: pageX, y: pageY };
      const current = { direccion, secIdx, dirIdx };
      dragRef.current = current;

      // Medir dónde está cada cosa en la ventana antes de mover nada
      rootRef.current?.measureInWindow((x, y) => {
        rootOrigin.current = { x, y };
        moveGhost();
      });
      hWrapRef.current?.measureInWindow((x, _y, width) => {
        hScrollWin.current = { x, width };
        updateDrop();
      });
      chipCenters.current = new Map();
      chipRefs.current.forEach((node, key) => {
        node?.measureInWindow?.((_x, y, _w, height) => chipCenters.current.set(key, y + height / 2));
      });

      moveGhost();
      setDrag(current);
    },
    onMove: (pageX, pageY) => {
      if (!dragRef.current) return;
      pointer.current = { x: pageX, y: pageY };
      moveGhost();
      updateDrop();
      const win = hScrollWin.current;
      if (pageX < win.x + EDGE_SCROLL_ZONE) startEdgeScroll(-1);
      else if (pageX > win.x + win.width - EDGE_SCROLL_ZONE) startEdgeScroll(1);
      else startEdgeScroll(0);
    },
    onEnd: (moved) => {
      const current = dragRef.current;
      const target = dropRef.current;
      endDrag();
      if (!current) return;
      if (!moved) {
        // Toque sin arrastre: elegir la secretaría en una lista
        setPicker({ direccion: current.direccion, secIdx: current.secIdx });
        return;
      }
      if (!target) return;
      const samePlace = target.secIdx === current.secIdx
        && (target.index === current.dirIdx || target.index === current.dirIdx + 1);
      if (!samePlace) requestMove(current.direccion, current.secIdx, target.secIdx, target.index);
    },
    onCancel: endDrag,
  });

  const dropLine = <View style={[styles.dropLine, { backgroundColor: theme.primary }]} />;

  const pickerOptions = useMemo(
    () => (picker ? secretarias.map((sec, index) => ({ sec, index })).filter(({ index }) => index !== picker.secIdx) : []),
    [picker, secretarias]
  );

  return (
    <View ref={rootRef} collapsable={false} style={styles.root}>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        {HAS_FINE_POINTER
          ? 'Arrastra una dirección a otra secretaría para moverla, o dentro de su columna para cambiar el orden.'
          : 'Mantén el asa ≡ y arrastra una dirección a otra secretaría, o tócala para elegir el destino.'}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!drag}>
        <View ref={hWrapRef} collapsable={false}>
        <ScrollView
          ref={hScrollRef}
          horizontal
          scrollEnabled={!drag}
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          onScroll={(event) => { scrollX.current = event.nativeEvent.contentOffset.x; }}
          scrollEventThrottle={16}
          onLayout={(event) => { hScrollWin.current.width = event.nativeEvent.layout.width; }}
          contentContainerStyle={styles.columns}
        >
          {secretarias.map((sec, secIdx) => {
            const isTarget = drop?.secIdx === secIdx;
            return (
              <View
                key={sec.nombre}
                style={[
                  styles.column,
                  { backgroundColor: theme.surfaceL2, borderColor: isTarget ? theme.primary : 'transparent' },
                ]}
              >
                <View style={[styles.columnHeader, { backgroundColor: theme.primary }]}>
                  <Ionicons name="business" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.columnName} numberOfLines={3}>{sec.nombre}</Text>
                  <View style={styles.columnCount}>
                    <Text style={styles.columnCountText}>{sec.direcciones.length}</Text>
                  </View>
                  <View style={styles.columnActions}>
                    {[
                      { icon: 'chevron-back', label: 'Mover a la izquierda', off: secIdx === 0, run: () => onMoveSecretaria(sec.nombre, secIdx - 1) },
                      { icon: 'chevron-forward', label: 'Mover a la derecha', off: secIdx === secretarias.length - 1, run: () => onMoveSecretaria(sec.nombre, secIdx + 1) },
                      { icon: 'pencil', label: 'Cambiar nombre', off: false, run: () => onRenameSecretaria(sec.nombre) },
                      { icon: 'trash-outline', label: 'Eliminar', off: false, run: () => onRemoveSecretaria(sec.nombre) },
                    ].map((action) => (
                      <TouchableOpacity
                        key={action.icon}
                        style={[styles.columnAction, (busy || action.off) && { opacity: 0.35 }]}
                        onPress={action.run}
                        disabled={busy || action.off}
                        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                        accessibilityRole="button"
                        accessibilityLabel={`${action.label}: ${sec.nombre}`}
                      >
                        <Ionicons name={action.icon} size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.columnBody}>
                  {sec.direcciones.map((dir, dirIdx) => (
                    <View key={dir}>
                      {isTarget && drop.index === dirIdx && dropLine}
                      <DireccionChip
                        name={dir}
                        theme={theme}
                        disabled={busy}
                        dragging={drag?.direccion === dir}
                        registerRef={(node) => {
                          const key = `${secIdx}:${dirIdx}`;
                          if (node) chipRefs.current.set(key, node);
                          else chipRefs.current.delete(key);
                        }}
                        onPress={() => setPicker({ direccion: dir, secIdx })}
                        dragHandlers={dragHandlersFor(dir, secIdx, dirIdx)}
                      />
                    </View>
                  ))}
                  {isTarget && drop.index >= sec.direcciones.length && dropLine}
                  {sec.direcciones.length === 0 && !isTarget && (
                    <Text style={[styles.empty, { color: theme.textTertiary }]}>
                      Sin direcciones. Suelta una aquí.
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addColumn, { borderColor: theme.primary }, busy && { opacity: 0.35 }]}
            onPress={onAddSecretaria}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Agregar secretaría"
          >
            <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
            <Text style={[styles.addColumnText, { color: theme.primary }]}>Agregar secretaría</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </ScrollView>

      {/* Ficha que sigue al puntero mientras se arrastra */}
      {drag && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghost,
            { backgroundColor: theme.card, borderColor: theme.primary, shadowColor: theme.shadowColor },
            { transform: ghost.getTranslateTransform() },
          ]}
        >
          <Ionicons name="reorder-two" size={18} color={theme.primary} />
          <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={2}>{drag.direccion}</Text>
        </Animated.View>
      )}

      {/* Mover sin arrastrar */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={[styles.pickerOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]} accessibilityRole="header">
              Mover dirección
            </Text>
            <Text style={[styles.pickerSubtitle, { color: theme.textSecondary }]} numberOfLines={3}>
              {picker?.direccion}
            </Text>
            <ScrollView style={styles.pickerList}>
              {pickerOptions.map(({ sec, index }) => (
                <TouchableOpacity
                  key={sec.nombre}
                  style={[styles.pickerRow, { borderBottomColor: theme.divider }]}
                  onPress={() => {
                    const current = picker;
                    setPicker(null);
                    requestMove(current.direccion, current.secIdx, index, sec.direcciones.length);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Mover a ${sec.nombre}`}
                >
                  <Ionicons name="business-outline" size={18} color={theme.primary} />
                  <Text style={[styles.pickerRowText, { color: theme.text }]}>{sec.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.pickerCancel, { backgroundColor: theme.surfaceL2 }]}
              onPress={() => setPicker(null)}
              accessibilityRole="button"
            >
              <Text style={[styles.pickerCancelText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hint: { fontSize: 14, lineHeight: 18, paddingHorizontal: SPACING.xs, paddingBottom: SPACING.sm },
  columns: { paddingHorizontal: COLS_PADDING, paddingBottom: SPACING.xl, gap: COL_GAP, alignItems: 'flex-start' },
  column: { width: COL_WIDTH, borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  columnHeader: { padding: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  columnName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 17 },
  columnCount: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1 },
  columnCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  columnActions: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  columnAction: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  columnBody: { padding: SPACING.sm, gap: SPACING.sm, minHeight: 72 },
  addColumn: {
    width: COL_WIDTH, minHeight: 120, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, padding: SPACING.md,
  },
  addColumnText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: TOUCH_TARGET.min,
  },
  chipHandle: {
    width: 34,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBody: { flex: 1, justifyContent: 'center', alignSelf: 'stretch' },
  chipName: { flex: 1, fontSize: 14, lineHeight: 17, paddingVertical: SPACING.sm, paddingRight: SPACING.sm },
  dropLine: { height: 3, borderRadius: 2, marginBottom: SPACING.sm },
  empty: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.md },
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: COL_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingLeft: SPACING.sm,
    borderRadius: 10,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 100,
  },
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  pickerCard: { width: '100%', maxWidth: 420, maxHeight: '80%', borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: SPACING.xl },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  pickerSubtitle: { fontSize: 14, lineHeight: 20, marginTop: SPACING.xs, marginBottom: SPACING.md },
  pickerList: { flexGrow: 0 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: TOUCH_TARGET.comfortable,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowText: { flex: 1, fontSize: 14, lineHeight: 20 },
  pickerCancel: { marginTop: SPACING.lg, minHeight: TOUCH_TARGET.min, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pickerCancelText: { fontSize: 16, fontWeight: '600' },
});
