// fixAreasCompleto2.mjs - Arreglar todas las áreas y direcciones faltantes
// Ejecuta: node fixAreasCompleto2.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

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

// Correcciones para secretarios - agregar direcciones faltantes
const correccionesSecretarios = {
  'desarrollo.economico@municipio.com': {
    direcciones: [
      'Dirección de Turismo',
      'Dirección de Desarrollo Económico',
      'Dirección de Desarrollo Agropecuario y Proyectos Productivos'
    ]
  }
};

// Correcciones para directores - cambiar área de "Secretaría X" a su dirección correcta
const correccionesDirectores = {
  // Secretaría General - Secretarios Técnicos que deben ser área de secretaría
  'amalia.escalante@municipio.com': {
    area: 'Secretaría General Municipal',
    role: 'director' // Secretario Técnico cuenta como director
  },
  'gerardo.mendoza@municipio.com': {
    area: 'Secretaría General Municipal',
    role: 'director'
  },
  // Obras Públicas - Secretario Técnico
  'vanessa.martinez@municipio.com': {
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    role: 'director'
  },
  // Bienestar Social
  'jose.zapata@municipio.com': {
    area: 'Dirección de Educación' // Ya tiene uno, este es duplicado - verificar
  },
  // Directores de Desarrollo Económico (huérfanos)
  'claudia.ramirez@municipio.com': {
    area: 'Dirección de Desarrollo Económico'
  },
  'pablo.vaquero@municipio.com': {
    area: 'Dirección de Desarrollo Agropecuario y Proyectos Productivos'
  },
  'berenice.moreno@municipio.com': {
    area: 'Dirección de Turismo'
  },
  // Otros huérfanos - ajustar áreas para que coincidan
  'lucila.ocampo@municipio.com': {
    // Este es secretario, no director
    role: 'secretario',
    area: 'Secretaría de Desarrollo Económico y Turismo'
  }
};

async function fix() {
  console.log('='.repeat(80));
  console.log('ARREGLANDO ÁREAS Y DIRECCIONES');
  console.log('='.repeat(80));

  const usersRef = collection(db, 'users');
  let actualizados = 0;

  // 1. Arreglar secretarios
  console.log('\n📋 ARREGLANDO SECRETARIOS...\n');
  
  for (const [email, correccion] of Object.entries(correccionesSecretarios)) {
    try {
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log(`   ❌ No encontrado: ${email}`);
        continue;
      }
      
      const docRef = doc(db, 'users', snapshot.docs[0].id);
      const userData = snapshot.docs[0].data();
      
      // Combinar direcciones existentes con nuevas
      const direccionesExistentes = userData.direcciones || [];
      const nuevasDirecciones = [...new Set([...direccionesExistentes, ...correccion.direcciones])];
      
      // También actualizar areasPermitidas
      const areasExistentes = userData.areasPermitidas || [];
      const nuevasAreas = [...new Set([userData.area, ...nuevasDirecciones, ...areasExistentes])].filter(Boolean);
      
      await updateDoc(docRef, {
        direcciones: nuevasDirecciones,
        areasPermitidas: nuevasAreas
      });
      
      console.log(`   ✅ ${email}`);
      console.log(`      Direcciones: ${nuevasDirecciones.join(', ')}`);
      actualizados++;
    } catch (error) {
      console.log(`   ❌ Error en ${email}: ${error.message}`);
    }
  }

  // 2. Arreglar directores
  console.log('\n📋 ARREGLANDO DIRECTORES...\n');
  
  for (const [email, correccion] of Object.entries(correccionesDirectores)) {
    try {
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log(`   ❌ No encontrado: ${email}`);
        continue;
      }
      
      const docRef = doc(db, 'users', snapshot.docs[0].id);
      const updateData = {};
      
      if (correccion.area) {
        updateData.area = correccion.area;
        updateData.areasPermitidas = [correccion.area];
      }
      if (correccion.role) {
        updateData.role = correccion.role;
      }
      
      if (Object.keys(updateData).length > 0) {
        await updateDoc(docRef, updateData);
        console.log(`   ✅ ${email}`);
        console.log(`      ${JSON.stringify(updateData)}`);
        actualizados++;
      }
    } catch (error) {
      console.log(`   ❌ Error en ${email}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ COMPLETADO: ${actualizados} usuarios actualizados`);
  console.log('='.repeat(80));
  
  process.exit(0);
}

fix().catch(console.error);
