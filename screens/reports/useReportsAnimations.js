// screens/reports/useReportsAnimations.js
// Animaciones de entrada de la pantalla de reportes.
import { useEffect, useMemo, useRef } from 'react';
import { Animated, InteractionManager, Platform } from 'react-native';
import { DURATION, spring, timing } from '../../theme/motion';

// En web las secciones se muestran sin animar (useNativeDriver da problemas ahí)
const IS_WEB = Platform.OS === 'web';

const useValue = (initial) => useRef(new Animated.Value(initial)).current;

const fadeStyle = (opacity, translateY) => ({
  opacity: IS_WEB ? 1 : opacity,
  transform: IS_WEB ? [] : [{ translateY }],
});

const scaleStyle = (scale) => (IS_WEB ? {} : { transform: [{ scale }] });

/**
 * @param {boolean} ready - La pantalla ya terminó de cargar
 * @param {Object} metricsByType - Al cambiar, se anima de nuevo la sección de jerarquía
 * @returns Estilos animados para cada sección
 */
export function useReportsAnimations(ready, metricsByType) {
  const headerOpacity = useValue(0);
  const headerSlide = useValue(-30);
  const filterOpacity = useValue(0);
  const filterSlide = useValue(20);
  const statsOpacity = useValue(0);
  const statsSlide = useValue(20);
  const emptyOpacity = useValue(0);
  const emptySlide = useValue(20);
  const chartsOpacity = useValue(0);
  const chartsSlide = useValue(20);

  const hierarchyOpacity = useValue(0);
  const hierarchySlide = useValue(40);
  const secretariaScale = useValue(0.9);
  const direccionScale = useValue(0.9);
  const pulse = useValue(1);

  // Entrada escalonada — espera a que termine la transición de navegación
  useEffect(() => {
    if (!ready) return undefined;

    const sections = [
      [headerOpacity, headerSlide, -30],
      [filterOpacity, filterSlide, 20],
      [statsOpacity, statsSlide, 20],
      [emptyOpacity, emptySlide, 20],
      [chartsOpacity, chartsSlide, 20],
    ];
    sections.forEach(([opacity, slide, from]) => {
      opacity.setValue(0);
      slide.setValue(from);
    });

    const start = () => {
      Animated.stagger(60, sections.map(([opacity, slide], index) => Animated.parallel([
        timing(opacity, 1),
        index === 0
          ? spring(slide, 0)
          : timing(slide, 0),
      ]))).start();
    };

    if (IS_WEB) {
      start();
      return undefined;
    }
    const interaction = InteractionManager.runAfterInteractions(start);
    return () => interaction.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Sección de jerarquía, cuando hay datos
  useEffect(() => {
    if (!(metricsByType.secretaria.total > 0 || metricsByType.direccion.total > 0)) return;

    hierarchyOpacity.setValue(0);
    hierarchySlide.setValue(40);
    secretariaScale.setValue(0.9);
    direccionScale.setValue(0.9);
    Animated.sequence([
      Animated.delay(50),
      Animated.parallel([
        timing(hierarchyOpacity, 1, { duration: DURATION.slow }),
        spring(hierarchySlide, 0),
      ]),
      Animated.stagger(60, [
        spring(secretariaScale, 1),
        spring(direccionScale, 1),
      ]),
    ]).start();

    // Un solo pulso (un ciclo infinito consumía CPU de forma constante)
    Animated.sequence([
      timing(pulse, 1.03, { duration: DURATION.slow }),
      timing(pulse, 1, { duration: DURATION.slow }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsByType]);

  return useMemo(() => ({
    header: fadeStyle(headerOpacity, headerSlide),
    filter: fadeStyle(filterOpacity, filterSlide),
    stats: fadeStyle(statsOpacity, statsSlide),
    empty: fadeStyle(emptyOpacity, emptySlide),
    charts: fadeStyle(chartsOpacity, chartsSlide),
    hierarchy: fadeStyle(hierarchyOpacity, hierarchySlide),
    secretariaScale: scaleStyle(secretariaScale),
    direccionScale: scaleStyle(direccionScale),
    pulse: scaleStyle(pulse),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
}
