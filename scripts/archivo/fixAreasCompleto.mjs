// fixAreasCompleto.mjs - Corregir todas las áreas de secretarios y directores
// Ejecuta: node fixAreasCompleto.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';

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

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE SECRETARIOS CON SUS DIRECCIONES EXACTAS
// ═══════════════════════════════════════════════════════════════

const secretariosConfig = [
  {
    email: 'secretaria.general@municipio.com',
    area: 'Secretaría General Municipal',
    direccionesAreas: [
      'Dirección de Gobierno',
      'Dirección de Reglamentos, Comercio, Mercado y Espectáculos',
      'Dirección de Recursos Materiales y Patrimonio',
      'Dirección de Atención al Migrante',
      'Dirección del Área Coordinadora de Archivo',
      'Oficial del Registro del Estado Familiar',
      'Unidad Central de Correspondencia',
      'Junta de Reclutamiento',
      'Conciliación Municipal',
    ]
  },
  {
    email: 'tesoreria@municipio.com',
    area: 'Secretaría de Tesorería Municipal',
    direccionesAreas: [
      'Dirección de Cuenta Pública',
      'Dirección de Control y Seguimiento de Egresos',
      'Dirección de Catastro',
      'Dirección de Ingresos y Estrategias de Recaudación',
      'Dirección de Administración',
      'Dirección de Recursos Humanos y Nómina',
    ]
  },
  {
    email: 'obras.publicas@municipio.com',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    direccionesAreas: [
      'Dirección de Obras Públicas',
      'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
      'Dirección de Servicios Públicos y Limpias',
      'Dirección de Servicios Municipales',
      'Dirección de Medio Ambiente y Desarrollo Sostenible',
    ]
  },
  {
    email: 'planeacion@municipio.com',
    area: 'Secretaría de Planeación y Evaluación',
    direccionesAreas: [
      'Dirección Técnica de Planeación y Evaluación',
      'Dirección de Tecnologías de la Información',
    ]
  },
  {
    email: 'bienestar.social@municipio.com',
    area: 'Secretaría de Bienestar Social',
    direccionesAreas: [
      'Dirección de Cultura',
      'Dirección del Deporte',
      'Dirección de Salud',
      'Dirección de Educación',
      'Dirección de Programas Sociales',
      'Instancia Municipal de la Juventud',
    ]
  },
  {
    email: 'seguridad.publica@municipio.com',
    area: 'Secretaría de Seguridad Pública',
    direccionesAreas: [
      'Dirección de Protección Civil y Bomberos',
      'Dirección de Prevención del Delito',
      'Dirección Administrativa (Seguridad Pública)',
      'Dirección Preventiva de Tránsito Municipal y Auxilio Vial',
    ]
  },
  {
    email: 'pueblos.indigenas@municipio.com',
    area: 'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas',
    direccionesAreas: []
  }
];

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE DIRECTORES CON SU ÁREA ESPECÍFICA
// ═══════════════════════════════════════════════════════════════

const directoresConfig = [
  // ===== SECRETARÍA GENERAL MUNICIPAL =====
  { email: 'amalia.escalante@municipio.com', area: 'Secretaría General Municipal', secretaria: 'Secretaría General Municipal' },
  { email: 'jose.angeles@municipio.com', area: 'Dirección de Gobierno', secretaria: 'Secretaría General Municipal' },
  { email: 'brenda.martinez@municipio.com', area: 'Conciliación Municipal', secretaria: 'Secretaría General Municipal' },
  { email: 'ernesto.espinoza@municipio.com', area: 'Dirección de Reglamentos, Comercio, Mercado y Espectáculos', secretaria: 'Secretaría General Municipal' },
  { email: 'gerardo.mendoza@municipio.com', area: 'Secretaría General Municipal', secretaria: 'Secretaría General Municipal' },
  { email: 'dulce.rosas@municipio.com', area: 'Unidad Central de Correspondencia', secretaria: 'Secretaría General Municipal' },
  { email: 'marcos.aguirre@municipio.com', area: 'Oficial del Registro del Estado Familiar', secretaria: 'Secretaría General Municipal' },
  { email: 'luis.olguin@municipio.com', area: 'Dirección del Área Coordinadora de Archivo', secretaria: 'Secretaría General Municipal' },
  { email: 'anahi.catalan@municipio.com', area: 'Dirección de Atención al Migrante', secretaria: 'Secretaría General Municipal' },
  { email: 'taurino.gonzalez@municipio.com', area: 'Dirección de Recursos Materiales y Patrimonio', secretaria: 'Secretaría General Municipal' },
  { email: 'roberto.ruiz@municipio.com', area: 'Junta de Reclutamiento', secretaria: 'Secretaría General Municipal' },

  // ===== SECRETARÍA DE TESORERÍA MUNICIPAL =====
  { email: 'alejandro.diaz@municipio.com', area: 'Dirección de Cuenta Pública', secretaria: 'Secretaría de Tesorería Municipal' },
  { email: 'miguel.tolentino@municipio.com', area: 'Dirección de Control y Seguimiento de Egresos', secretaria: 'Secretaría de Tesorería Municipal' },
  { email: 'juan.sanchez@municipio.com', area: 'Dirección de Catastro', secretaria: 'Secretaría de Tesorería Municipal' },
  { email: 'hector.perez@municipio.com', area: 'Dirección de Ingresos y Estrategias de Recaudación', secretaria: 'Secretaría de Tesorería Municipal' },
  { email: 'juana.moctezuma@municipio.com', area: 'Dirección de Administración', secretaria: 'Secretaría de Tesorería Municipal' },
  { email: 'isabel.munoz@municipio.com', area: 'Dirección de Recursos Humanos y Nómina', secretaria: 'Secretaría de Tesorería Municipal' },

  // ===== SECRETARÍA DE OBRAS PÚBLICAS Y DESARROLLO URBANO =====
  { email: 'vanessa.martinez@municipio.com', area: 'Secretaría de Obras Públicas y Desarrollo Urbano', secretaria: 'Secretaría de Obras Públicas y Desarrollo Urbano' },
  { email: 'gladys.zapote@municipio.com', area: 'Dirección de Obras Públicas', secretaria: 'Secretaría de Obras Públicas y Desarrollo Urbano' },
  { email: 'alfonso.alavez@municipio.com', area: 'Dirección de Desarrollo Urbano y Ordenamiento Territorial', secretaria: 'Secretaría de Obras Públicas y Desarrollo Urbano' },
  { email: 'rosalio.romero@municipio.com', area: 'Dirección de Servicios Públicos y Limpias', secretaria: 'Secretaría de Obras Públicas y Desarrollo Urbano' },
  { email: 'julio.palma@municipio.com', area: 'Dirección de Servicios Municipales', secretaria: 'Secretaría de Obras Públicas y Desarrollo Urbano' },

  // ===== SECRETARÍA DE PLANEACIÓN Y EVALUACIÓN =====
  { email: 'efrain.volteada@municipio.com', area: 'Dirección Técnica de Planeación y Evaluación', secretaria: 'Secretaría de Planeación y Evaluación' },
  { email: 'luis.chavero@municipio.com', area: 'Dirección de Tecnologías de la Información', secretaria: 'Secretaría de Planeación y Evaluación' },
  { email: 'lucila.ocampo@municipio.com', area: 'Secretaría de Desarrollo Económico y Turismo', secretaria: 'Secretaría de Planeación y Evaluación' },
  { email: 'berenice.moreno@municipio.com', area: 'Dirección de Turismo', secretaria: 'Secretaría de Planeación y Evaluación' },
  { email: 'claudia.ramirez@municipio.com', area: 'Dirección de Desarrollo Económico', secretaria: 'Secretaría de Planeación y Evaluación' },
  { email: 'pablo.vaquero@municipio.com', area: 'Dirección de Desarrollo Agropecuario y Proyectos Productivos', secretaria: 'Secretaría de Planeación y Evaluación' },

  // ===== SECRETARÍA DE BIENESTAR SOCIAL =====
  { email: 'hipolito.bartolo@municipio.com', area: 'Dirección de Cultura', secretaria: 'Secretaría de Bienestar Social' },
  { email: 'christian.trejo@municipio.com', area: 'Dirección del Deporte', secretaria: 'Secretaría de Bienestar Social' },
  { email: 'rosa.labra@municipio.com', area: 'Dirección de Salud', secretaria: 'Secretaría de Bienestar Social' },
  { email: 'jose.zapata@municipio.com', area: 'Dirección de Educación', secretaria: 'Secretaría de Bienestar Social' },
  { email: 'alicia.feregrino@municipio.com', area: 'Dirección de Programas Sociales', secretaria: 'Secretaría de Bienestar Social' },
  { email: 'michelle.chiapa@municipio.com', area: 'Instancia Municipal de la Juventud', secretaria: 'Secretaría de Bienestar Social' },

  // ===== SECRETARÍA DE SEGURIDAD PÚBLICA =====
  { email: 'marcelino.capula@municipio.com', area: 'Dirección de Protección Civil y Bomberos', secretaria: 'Secretaría de Seguridad Pública' },
];

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DE ACTUALIZACIÓN
// ═══════════════════════════════════════════════════════════════

async function updateUser(email, updates) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`   ⚠️  ${email} no encontrado en la base de datos`);
      return false;
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error con ${email}:`, error.message);
    return false;
  }
}

async function fixSecretarios() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           ACTUALIZANDO SECRETARIOS                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const sec of secretariosConfig) {
    console.log(`📌 ${sec.email}`);
    
    const areasPermitidas = [sec.area, ...sec.direccionesAreas];
    
    const result = await updateUser(sec.email, {
      area: sec.area,
      direcciones: sec.direccionesAreas,
      areasPermitidas: areasPermitidas,
      department: sec.area // Mantener compatibilidad
    });
    
    if (result) {
      console.log(`   ✅ Área: ${sec.area}`);
      console.log(`   📋 Direcciones: ${sec.direccionesAreas.length}`);
      sec.direccionesAreas.forEach(d => console.log(`      • ${d}`));
      exitosos++;
    } else {
      fallidos++;
    }
    console.log('');
  }
  
  return { exitosos, fallidos };
}

async function fixDirectores() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           ACTUALIZANDO DIRECTORES                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const dir of directoresConfig) {
    console.log(`📌 ${dir.email}`);
    
    const result = await updateUser(dir.email, {
      area: dir.area,
      secretaria: dir.secretaria,
      department: dir.area, // Mantener compatibilidad
      areasPermitidas: [dir.area] // Director solo ve su área
    });
    
    if (result) {
      console.log(`   ✅ Área: ${dir.area}`);
      console.log(`   🏛️ Secretaría: ${dir.secretaria}`);
      exitosos++;
    } else {
      fallidos++;
    }
    console.log('');
  }
  
  return { exitosos, fallidos };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🛠️  CORRECCIÓN COMPLETA DE ÁREAS - SECRETARIOS Y DIRECTORES');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  📅 Fecha: ${new Date().toLocaleString()}`);
  
  const resultSecretarios = await fixSecretarios();
  const resultDirectores = await fixDirectores();
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 RESUMEN');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Secretarios: ✅ ${resultSecretarios.exitosos} | ❌ ${resultSecretarios.fallidos}`);
  console.log(`  Directores:  ✅ ${resultDirectores.exitosos} | ❌ ${resultDirectores.fallidos}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n✨ Proceso completado!');
  console.log('\n💡 Los usuarios deben cerrar sesión y volver a iniciar');
  console.log('   para ver los cambios reflejados.\n');
  
  process.exit(0);
}

main().catch(console.error);
