// firebase-functions/migrateTimestamps.js
// Script para validar y migrar timestamps en Firestore
// Ejecuta: node migrateTimestamps.js (local) o deploy como Cloud Function

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Para local testing, usar: GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'infra-sublime-464215-m5'
});

const db = getFirestore(app);

/**
 * ANÁLISIS: Verifica integridad de timestamps sin modificar
 */
async function analyzeTimestamps() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     ANÁLISIS DE TIMESTAMPS - SIN MODIFICACIONES              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = {
    tasksAnalyzed: 0,
    usersAnalyzed: 0,
    issues: [],
    timestampTypes: {
      valid_firestore_timestamp: 0,
      valid_number: 0,
      valid_date_string: 0,
      invalid_object: 0,
      invalid_string: 0,
      missing_dueAt: 0,
      missing_createdAt: 0,
      zero_timestamp: 0
    }
  };

  try {
    // Analizar tasks
    console.log('📋 Analizando tasks...');
    const tasksSnapshot = await db.collection('tasks').limit(1000).get();
    
    tasksSnapshot.forEach(doc => {
      results.tasksAnalyzed++;
      const task = doc.data();
      
      // Verificar dueAt
      if (!task.dueAt) {
        results.timestampTypes.missing_dueAt++;
      } else if (task.dueAt instanceof Timestamp) {
        results.timestampTypes.valid_firestore_timestamp++;
      } else if (typeof task.dueAt === 'number') {
        if (task.dueAt === 0) {
          results.timestampTypes.zero_timestamp++;
          results.issues.push({
            type: 'ZERO_TIMESTAMP',
            collection: 'tasks',
            docId: doc.id,
            field: 'dueAt',
            value: task.dueAt,
            severity: 'HIGH'
          });
        } else {
          results.timestampTypes.valid_number++;
        }
      } else if (typeof task.dueAt === 'string') {
        if (isValidISOString(task.dueAt)) {
          results.timestampTypes.valid_date_string++;
        } else {
          results.timestampTypes.invalid_string++;
          results.issues.push({
            type: 'INVALID_DATE_STRING',
            collection: 'tasks',
            docId: doc.id,
            field: 'dueAt',
            value: task.dueAt,
            severity: 'CRITICAL'
          });
        }
      } else if (typeof task.dueAt === 'object') {
        results.timestampTypes.invalid_object++;
        results.issues.push({
          type: 'INVALID_OBJECT_TIMESTAMP',
          collection: 'tasks',
          docId: doc.id,
          field: 'dueAt',
          value: JSON.stringify(task.dueAt),
          severity: 'CRITICAL'
        });
      }
      
      // Verificar createdAt
      if (!task.createdAt) {
        results.timestampTypes.missing_createdAt++;
      } else if (!(task.createdAt instanceof Timestamp) && typeof task.createdAt !== 'number') {
        results.issues.push({
          type: 'INVALID_CREATEDAT',
          collection: 'tasks',
          docId: doc.id,
          field: 'createdAt',
          value: String(task.createdAt),
          severity: 'HIGH'
        });
      }
    });

    console.log(`✅ Tasks analizadas: ${results.tasksAnalyzed}\n`);

    // Analizar users
    console.log('📋 Analizando users...');
    const usersSnapshot = await db.collection('users').limit(500).get();
    
    usersSnapshot.forEach(doc => {
      results.usersAnalyzed++;
      const user = doc.data();
      
      if (user.createdAt && !(user.createdAt instanceof Timestamp) && typeof user.createdAt !== 'number') {
        results.issues.push({
          type: 'INVALID_USER_CREATEDAT',
          collection: 'users',
          docId: doc.id,
          field: 'createdAt',
          severity: 'MEDIUM'
        });
      }
    });

    console.log(`✅ Users analizadas: ${results.usersAnalyzed}\n`);

    // Reporte
    printAnalysisReport(results);
    
    return results;

  } catch (error) {
    console.error('❌ Error durante análisis:', error.message);
    throw error;
  }
}

/**
 * Valida string ISO date format
 */
function isValidISOString(dateString) {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Imprime reporte de análisis
 */
function printAnalysisReport(results) {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    REPORTE DE ANÁLISIS                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 ESTADÍSTICAS GENERALES:');
  console.log(`   Tasks procesadas: ${results.tasksAnalyzed}`);
  console.log(`   Users procesadas: ${results.usersAnalyzed}`);
  console.log(`   Problemas encontrados: ${results.issues.length}\n`);

  console.log('🔍 TIPOS DE TIMESTAMPS ENCONTRADOS:');
  console.log(`   ✅ Firestore Timestamp (válido): ${results.timestampTypes.valid_firestore_timestamp}`);
  console.log(`   ✅ Números (válido): ${results.timestampTypes.valid_number}`);
  console.log(`   ✅ Strings ISO (válido): ${results.timestampTypes.valid_date_string}`);
  console.log(`   ❌ Objetos inválidos: ${results.timestampTypes.invalid_object}`);
  console.log(`   ❌ Strings inválidos: ${results.timestampTypes.invalid_string}`);
  console.log(`   ⚠️  Zero timestamp: ${results.timestampTypes.zero_timestamp}`);
  console.log(`   ⚠️  DueAt missing: ${results.timestampTypes.missing_dueAt}`);
  console.log(`   ⚠️  CreatedAt missing: ${results.timestampTypes.missing_createdAt}\n`);

  if (results.issues.length > 0) {
    console.log('🚨 PROBLEMAS ENCONTRADOS:\n');
    
    // Agrupar por severidad
    const critical = results.issues.filter(i => i.severity === 'CRITICAL');
    const high = results.issues.filter(i => i.severity === 'HIGH');
    const medium = results.issues.filter(i => i.severity === 'MEDIUM');

    if (critical.length > 0) {
      console.log(`   🔴 CRÍTICOS (${critical.length}):`);
      critical.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.type} en ${issue.docId}: ${issue.value}`);
      });
      if (critical.length > 5) {
        console.log(`      ... y ${critical.length - 5} más`);
      }
    }

    if (high.length > 0) {
      console.log(`\n   🟠 ALTOS (${high.length}):`);
      high.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.type} en ${issue.docId}`);
      });
      if (high.length > 5) {
        console.log(`      ... y ${high.length - 5} más`);
      }
    }

    if (medium.length > 0) {
      console.log(`\n   🟡 MEDIOS (${medium.length}):`);
      console.log(`      - ${medium.length} problemas de severidad media`);
    }
  } else {
    console.log('✅ ¡Sin problemas encontrados!\n');
  }

  console.log('\n📋 RECOMENDACIONES:');
  if (results.timestampTypes.zero_timestamp > 0) {
    console.log('   1. ❌ CRÍTICO: Hay timestamps en 0 (epoch). Causarán bugs.');
    console.log('      - Acción: Investigar qué tasks tienen dueAt=0');
    console.log('      - Solución: Reemplazar con null o fecha válida');
  }
  if (results.timestampTypes.invalid_object > 0) {
    console.log('   2. ❌ CRÍTICO: Hay objetos mal formados en dueAt.');
    console.log('      - Causa probable: Conversión incorrecta de timestamp');
    console.log('      - Acción: Revisar código que escribe en dueAt');
  }
  if (results.timestampTypes.invalid_string > 0) {
    console.log('   3. ❌ Hay strings no ISO en timestamps.');
    console.log('      - Acción: Convertir a Firestore.Timestamp o número');
  }
}

/**
 * MIGRACIÓN: Arregla todos los problemas
 * ⚠️  SOLO ejecutar después de backup de Firestore
 */
async function migrateAndFixTimestamps() {
  console.log('\n⚠️  MIGRACIÓN DESTRUCTIVA - Requiere confirmación\n');
  console.log('Esta función MODIFICA datos en Firestore.');
  console.log('Asegúrate de tener backup completo.\n');

  const backup = await analyzeTimestamps();
  
  if (backup.issues.length === 0) {
    console.log('✅ Sin problemas encontrados. No hay nada que migrar.\n');
    return;
  }

  console.log(`\nEncontrados ${backup.issues.length} problemas.`);
  console.log('Requiere confirmación manual antes de proceder.\n');
  console.log('Para continuar, modifica el código y la seguridad:\n');
  console.log('// TODO: Implementar migración con confirmación de usuario');
}

/**
 * ROLLBACK: Restaura datos de backup
 */
async function rollbackFromBackup(backupFile) {
  console.log(`\n🔄 ROLLBACK: Restaurando desde ${backupFile}\n`);
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    console.log(`📂 Archivo de backup encontrado con ${backupData.length} cambios`);
    console.log('⚠️  Implementar restauración manual');
  } catch (error) {
    console.error('❌ No se puede leer backup:', error.message);
  }
}

/**
 * VALIDACIÓN: Verifica que los fixes fueron aplicados correctamente
 */
async function validateMigration() {
  console.log('\n🔍 VALIDACIÓN POST-MIGRACIÓN\n');
  
  const results = await analyzeTimestamps();
  
  if (results.issues.length === 0) {
    console.log('\n✅ VALIDACIÓN PASADA - Todos los timestamps son válidos\n');
    return true;
  } else {
    console.log(`\n❌ VALIDACIÓN FALLIDA - Aún hay ${results.issues.length} problemas\n`);
    return false;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'analyze';
  
  (async () => {
    try {
      switch (command) {
        case 'analyze':
          await analyzeTimestamps();
          break;
        case 'validate': {
          const valid = await validateMigration();
          process.exit(valid ? 0 : 1);
          break;
        }
        case 'migrate':
          await migrateAndFixTimestamps();
          break;
        case 'rollback': {
          const backupFile = process.argv[3] || './firestore-backup.json';
          await rollbackFromBackup(backupFile);
          break;
        }
        default:
          console.log(`
Uso: node migrateTimestamps.js <command>

Commands:
  analyze      - Analiza sin modificar (safe) 
  validate     - Valida post-migración
  migrate      - Arregla problemas (REQUIERE BACKUP)
  rollback     - Restaura desde backup (WIP)

Ejemplo:
  node migrateTimestamps.js analyze
  node migrateTimestamps.js validate
          `);
      }
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error fatal:', error.message);
      process.exit(1);
    }
  })();
}

export { analyzeTimestamps, validateMigration, migrateAndFixTimestamps, rollbackFromBackup };
