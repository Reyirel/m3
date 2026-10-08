// index.js - Entry point con polyfills

// Suprimir console.log en producción
if (!__DEV__) {
	console.log = () => {};
	console.warn = () => {};
	console.debug = () => {};
	// Mantener console.error para errores críticos
}

// Las variables de entorno llegan por app.config.js (Expo las lee de .env al compilar).
// Aquí no se usa dotenv: es un módulo de Node y hacía fallar el bundle de Android e iOS.
import './polyfills';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

// Web: registrar el service worker para que la app abra y recargue sin internet.
// Solo en producción: en desarrollo interferiría con la recarga en caliente.
if (!__DEV__ && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.serviceWorker) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch((error) => {
			console.error('No se pudo registrar el service worker:', error);
		});
	});
}
