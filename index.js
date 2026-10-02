// index.js - Entry point con polyfills

// Suprimir console.log en producción
if (!__DEV__) {
	console.log = () => {};
	console.warn = () => {};
	console.debug = () => {};
	// Mantener console.error para errores críticos
}

// Carga variables de entorno desde .env si no estamos en producción ni en entorno Expo
if (!process.env.FIREBASE_API_KEY) {
	try {
		require('dotenv').config();
	} catch (e) {
		// dotenv no está disponible (por ejemplo, en Expo managed)
	}
}
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
