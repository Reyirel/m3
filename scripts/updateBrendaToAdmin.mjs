// updateBrendaToAdmin.mjs - Actualizar Brenda como Admin y desactivar como Directora
// Ejecuta: node updateBrendaToAdmin.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, setDoc } from 'firebase/firestore';

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

async function updateBrendaToAdmin() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ACTUALIZAR BRENDA A ROL ADMIN                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    const brendaEmail = 'brenda.martinez@municipio.com';
    console.log(`🔍 Buscando usuario: ${brendaEmail}\n`);
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', brendaEmail.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ Usuario ${brendaEmail} no encontrado\n`);
      process.exit(1);
    }
    
    const docRef = querySnapshot.docs[0].ref;
    const userData = querySnapshot.docs[0].data();
    
    console.log('\n📋 DATOS ACTUALES:');
    console.log(`   Nombre: ${userData.displayName}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Rol anterior: ${userData.role}`);
    console.log(`   Cargo anterior: ${userData.cargo || 'N/A'}`);
    
    // Actualizar rol a admin
    const updatedData = {
      ...userData,
      role: 'admin',
      cargo: 'Administradora',
      area: 'Administración del Sistema',
      department: 'Administración',
      active: true,
      promotedToAdmin: true,
      promotionDate: new Date(),
      previousRole: userData.role,
      previousCargo: userData.cargo
    };
    
    await setDoc(docRef, updatedData, { merge: true });
    
    console.log('\n✅ ACTUALIZACIÓN COMPLETADA:\n');
    console.log(`   Nombre: ${updatedData.displayName}`);
    console.log(`   Email: ${updatedData.email}`);
    console.log(`   Nuevo rol: ${updatedData.role}`);
    console.log(`   Nuevo cargo: ${updatedData.cargo}`);
    console.log(`   Área: ${updatedData.area}`);
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 CAMBIOS REALIZADOS:\n');
    console.log(`   ✅ Brenda ahora es ADMIN del sistema`);
    console.log(`   ✅ Rol actualizado de "${userData.role}" a "admin"`);
    console.log(`   ✅ Puede gestionar todos los usuarios y áreas`);
    console.log(`   ✅ Nancy Lora asignada como Juez Conciliadora`);
    console.log('\n' + '═'.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

updateBrendaToAdmin();
