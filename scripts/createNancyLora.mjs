// createNancyLora.mjs - Crear usuario Nancy Lora (Juez Conciliadora)
// Ejecuta: node createNancyLora.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc } from 'firebase/firestore';

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

// Hash simple - DEBE SER IGUAL AL DE authFirestore.js
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Datos de Nancy Lora - Transferencia de rol de Brenda
const nancyLora = {
  email: 'nancy.lora@municipio.com',
  password: 'ConJue2026',  // Conciliadora Juez 2026
  displayName: 'Lic. Nancy Lora',
  role: 'director',
  cargo: 'Juez Conciliadora',
  area: 'Gobierno - Conciliación',
  phone: '7721394600',
  department: 'Gobierno'
};

async function createNancy() {
  const { email, password, displayName, role, cargo, area, phone, department } = nancyLora;
  
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CREANDO USUARIO NANCY LORA - JUEZ CONCILIADORA          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 DATOS DE CREACIÓN:');
  console.log(`   Email: ${email}`);
  console.log(`   Contraseña: ${password}`);
  console.log(`   Nombre: ${displayName}`);
  console.log(`   Cargo: ${cargo}`);
  console.log(`   Área: ${area}`);
  console.log(`   Rol: ${role}\n`);
  
  try {
    console.log('🔥 Creando usuario en Firestore...\n');
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    const hashedPassword = simpleHash(password + email.toLowerCase());
    
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName,
      role: role,
      cargo: cargo,
      area: area,
      phone: phone,
      department: department,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      transferredFrom: 'brenda.martinez@municipio.com',
      transferDate: new Date()
    };
    
    if (!querySnapshot.empty) {
      console.log(`⚠️  El usuario ya existe. Actualizando...\n`);
      const docRef = querySnapshot.docs[0].ref;
      await setDoc(docRef, userData, { merge: true });
      console.log(`✅ ${displayName} ACTUALIZADO\n`);
    } else {
      const newDocRef = await addDoc(usersRef, userData);
      console.log(`✅ ${displayName} CREADO\n`);
      console.log(`   ID en Firestore: ${newDocRef.id}\n`);
    }
    
    console.log('═'.repeat(60));
    console.log('\n🎯 CREDENCIALES PARA NANCY LORA:\n');
    console.log(`   📧 Usuario: ${email}`);
    console.log(`   🔐 Contraseña: ${password}`);
    console.log(`   💼 Cargo: ${cargo}`);
    console.log(`   🏢 Área: ${area}`);
    console.log('\n✅ Usuario listo para usar en la aplicación');
    console.log('═'.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error al crear usuario:`, error.message);
    console.error('\nDetalles del error:', error);
    process.exit(1);
  }
}

createNancy();
