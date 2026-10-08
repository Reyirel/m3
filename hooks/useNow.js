// hooks/useNow.js
// Hora actual que se refresca cada minuto, para textos como "vence en 3h".
// Un solo temporizador para toda la app: antes cada tarjeta de la lista tenía el suyo.
import { useEffect, useState } from 'react';

const TICK_MS = 60000;
const listeners = new Set();
let timer = null;

const subscribe = (listener) => {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      const now = Date.now();
      listeners.forEach((notify) => notify(now));
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

/** @param {boolean} [active=true] - false para no suscribirse (p. ej. tareas cerradas) */
export function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => (active ? subscribe(setNow) : undefined), [active]);
  return now;
}

export default useNow;
