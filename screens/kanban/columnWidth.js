// screens/kanban/columnWidth.js
// Ancho de cada columna del tablero según el tamaño de la pantalla.

const GAP = 12;

// Ancho para que quepan `count` columnas completas
const fit = (screenWidth, padding, count) => (screenWidth - padding * 2 - GAP * (count - 1)) / count;

/**
 * @param {number} screenWidth
 * @param {boolean} isWeb
 * @returns {number} Ancho de una columna
 */
export const getColumnWidth = (screenWidth, isWeb) => {
  if (isWeb) {
    const padding = 16;
    if (screenWidth > 1100) return fit(screenWidth, padding, 4);
    if (screenWidth > 850) return fit(screenWidth, padding, 3);
    if (screenWidth > 600) return fit(screenWidth, padding, 2);
    // Teléfono: ancho fijo y desplazamiento horizontal
    return screenWidth > 400 ? 280 : 260;
  }
  // Tableta: dos columnas. Teléfono: una columna casi completa y desplazamiento horizontal
  if (screenWidth > 768) return fit(screenWidth, 8, 2);
  return screenWidth * (screenWidth > 480 ? 0.85 : 0.88);
};
