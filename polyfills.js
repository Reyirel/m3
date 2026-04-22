// polyfills.js
// Polyfills necesarios para react-native-reanimated y gesture-handler en web

// Establecer global si no existe
if (typeof global === 'undefined') {
  window.global = window;
}

// Polyfills críticos para reanimated
try {
  if (typeof window !== 'undefined') {
    window.identical = window.identical || function(a, b) { return a === b; };
  }
} catch (e) { /* intencional */ }
if (typeof global !== 'undefined') {
  global.identical = global.identical || function(a, b) { return a === b; };
}

// Mockear _WORKLET si no existe
if (typeof global._WORKLET === 'undefined') {
  global._WORKLET = false;
}

// Polyfill para requestAnimationFrame
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 1000 / 60);
  };
}

if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}

// Mockear funciones de reanimated que no existen en web
if (typeof global._makeShareableClone === 'undefined') {
  global._makeShareableClone = (value) => value;
}

if (typeof global._scheduleOnJS === 'undefined') {
  global._scheduleOnJS = (fn) => {
    if (typeof fn === 'function') fn();
  };
}

export {};
