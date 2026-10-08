// app.config.js
// Expo ya carga automáticamente las variables de .env
// No necesitamos require('dotenv') porque no funciona en React Native

// El .env usa el prefijo REACT_APP_; aceptamos ambos nombres
const env = (name) => process.env[name] || process.env[`REACT_APP_${name}`];

module.exports = {
  expo: {
    name: 'Gestión Municipal',
    slug: 'm2-todo-app',
    version: '1.4.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#9F2241'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.todoapp.todo',
      googleServicesFile: './GoogleService-Info.plist'
    },
    android: {
      package: 'com.todoapp.todo',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#9F2241'
      },
      permissions: [
        'NOTIFICATIONS',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'CAMERA',
        'READ_MEDIA_IMAGES',
        'READ_EXTERNAL_STORAGE'
      ]
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      config: {
        firebase: {
          apiKey: env('FIREBASE_API_KEY'),
          authDomain: env('FIREBASE_AUTH_DOMAIN'),
          projectId: env('FIREBASE_PROJECT_ID'),
          storageBucket: env('FIREBASE_STORAGE_BUCKET'),
          messagingSenderId: env('FIREBASE_MESSAGING_SENDER_ID'),
          appId: env('FIREBASE_APP_ID')
        }
      },
      // PWA support
      lang: 'es',
      name: 'Sistema de Gestión Municipal',
      shortName: 'Gestión Municipal',
      description: 'Tareas y coordinación entre áreas del municipio',
      themeColor: '#9F2241',
      backgroundColor: '#9F2241',
      display: 'standalone',
      orientation: 'portrait',
      startUrl: '/',
      scope: '/'
    },
    plugins: [
      'expo-notifications',
      [
        'expo-image-picker',
        {
          cameraPermission: 'Necesitamos acceso a tu cámara para enviar fotos.',
          microphonePermission: false,
          photosPermission: 'Necesitamos acceso a tu galería para enviar imágenes.'
        }
      ]
    ],
    updates: {
      enabled: false,
      fallbackToCacheTimeout: 0
    },
    extra: {
      FIREBASE_API_KEY: env('FIREBASE_API_KEY'),
      FIREBASE_AUTH_DOMAIN: env('FIREBASE_AUTH_DOMAIN'),
      FIREBASE_PROJECT_ID: env('FIREBASE_PROJECT_ID'),
      FIREBASE_STORAGE_BUCKET: env('FIREBASE_STORAGE_BUCKET'),
      FIREBASE_MESSAGING_SENDER_ID: env('FIREBASE_MESSAGING_SENDER_ID'),
      FIREBASE_APP_ID: env('FIREBASE_APP_ID'),
      FIREBASE_MEASUREMENT_ID: env('FIREBASE_MEASUREMENT_ID'),
      eas: {
        // Ejecuta: eas build:configure  para generar y fijar el projectId real
        projectId: process.env.EAS_PROJECT_ID || undefined
      }
    }
  }
};
