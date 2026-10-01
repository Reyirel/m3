// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ✅ OPTIMIZACIÓN: Soportar extensiones de archivo incluyendo WebP
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.resolver.assetExts = [...config.resolver.assetExts, 'webp'];

// ✅ OPTIMIZACIÓN: Mejorar minificación para reducir bundle size
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: true,
  compress: {
    unused: true,
    dead_code: true,
    passes: 2, // Multiple passes para mejor optimización
  },
};

// ✅ OPTIMIZACIÓN: Excluir archivos de test del bundling
config.resolver.blockList =/node_modules\/(.*\/)?.*(test|__tests__|spec)\.(ts|js)$/;

module.exports = config;
