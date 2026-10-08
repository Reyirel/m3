// verificarTesorero.mjs - Verificar datos del Tesorero y sus directores
// Ejecuta: node verificarTesorero.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: "infra-sublime-464215-m5.firebaseapp.com",
  projectId: "infra-sublime-464215-m5",
  storageBucket: "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: "205062729291",
  appId: "1:205062729291:web:da314180f361bf2a3367ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verificar() {
  console.log('='.repeat(80));
  console.log('VERIFICANDO TESORERO Y SUS DIRECTORES');
  console.log('='.repeat(80));

  // 1. Buscar al tesorero
  const usersRef = collection(db, 'users');
  const tesoreroQ = query(usersRef, where('email', '==', 'tesoreria@municipio.com'));
  const tesoreroSnap = await getDocs(tesoreroQ);
  
  if (tesoreroSnap.empty) {
    console.log('❌ No se encontró el usuario tesoreria@municipio.com');
    process.exit(1);
  }
  
  const tesorero = tesoreroSnap.docs[0].data();
  console.log('\n📊 DATOS DEL TESORERO:');
  console.log('  Email:', tesorero.email);
  console.log('  Nombre:', tesorero.displayName);
  console.log('  Rol:', tesorero.role);
  console.log('  Área:', tesorero.area);
  console.log('  Direcciones:', tesorero.direcciones);
  console.log('  AreasPermitidas:', tesorero.areasPermitidas);
  
  // 2. Buscar directores de Tesorería
  console.log('\n📊 DIRECTORES EN LA BASE DE DATOS (rol=director):');
  const directoresQ = query(usersRef, where('role', '==', 'director'));
  const directoresSnap = await getDocs(directoresQ);
  
  const directoresTesoreria = [];
  directoresSnap.forEach(doc => {
    const d = doc.data();
    // Buscar directores que tengan "Tesorería" en su área o que coincidan
    const areaLower = (d.area || '').toLowerCase();
    if (areaLower.includes('cuenta') || 
        areaLower.includes('egreso') || 
        areaLower.includes('catastro') || 
        areaLower.includes('ingreso') || 
        areaLower.includes('recaudación') ||
        areaLower.includes('administración') ||
        areaLower.includes('recursos humanos') ||
        areaLower.includes('nómina')) {
      directoresTesoreria.push(d);
    }
  });
  
  console.log(`\n  📋 Directores relacionados a Tesorería encontrados: ${directoresTesoreria.length}`);
  directoresTesoreria.forEach(d => {
    console.log(`    - ${d.displayName || d.email}`);
    console.log(`      Email: ${d.email}`);
    console.log(`      Área: ${d.area}`);
    console.log('');
  });
  
  // 3. Comparar direcciones del tesorero con áreas de directores
  console.log('\n📊 COMPARACIÓN DE ÁREAS:');
  const direccionesTesorero = tesorero.direcciones || [];
  const areasDirectores = directoresTesoreria.map(d => d.area);
  
  console.log('\n  Direcciones que tiene el Tesorero:');
  direccionesTesorero.forEach(dir => {
    const match = areasDirectores.some(area => 
      area?.toLowerCase().includes(dir.toLowerCase().replace('Director de ', '').replace('Dirección de ', ''))
    );
    console.log(`    ${match ? '✅' : '❌'} "${dir}"`);
  });
  
  console.log('\n  Áreas de los Directores:');
  areasDirectores.forEach(area => {
    const match = direccionesTesorero.some(dir => 
      dir?.toLowerCase().includes(area?.toLowerCase().replace('Director de ', '').replace('Dirección de ', ''))
    );
    console.log(`    ${match ? '✅' : '❌'} "${area}"`);
  });
  
  // 4. Sugerir corrección
  console.log('\n🔧 CORRECCIÓN SUGERIDA:');
  console.log('  Las direcciones del tesorero deberían coincidir con las áreas de los directores.');
  console.log('  Áreas de directores actuales:', areasDirectores);
  
  process.exit(0);
}

verificar().catch(console.error);
