// Services for task reports with images and evidence
import { 
  db, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from '../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toMs } from '../utils/dateUtils';
import { uriToDataUrl, dataUrlToBlob } from '../utils/imageData';
import { canUserSeeTask, filterVisibleReports } from '../utils/taskVisibility';
import { getAllUsers } from './usersDirectory';

const storage = getStorage();

/**
 * Notificar a los admins y a los secretarios que pueden ver la tarea sobre un nuevo reporte.
 * No bloquea ni hace fallar el envío del reporte.
 */
const notifyAdminsOfNewReport = async (taskId, reportId, reportTitle, createdByName, taskData = {}, senderEmail = '') => {
  try {
    const taskTitle = taskData.title || 'Tarea sin título';
    const taskArea = taskData.area || '';
    const sender = (senderEmail || '').toLowerCase().trim();

    const users = await getAllUsers();

    const notifications = [];
    users.forEach((user) => {
      const email = (user.email || '').toLowerCase().trim();
      // Cuentas desactivadas y el propio autor no reciben aviso
      if (user.active === false || !email || email === sender) return;

      const isAdmin = user.role === 'admin';
      // Mismo criterio de visibilidad que la lista de tareas (utils/taskVisibility.js)
      const isSecretarioOfTask = user.role === 'secretario' && canUserSeeTask(taskData, user);
      if (!isAdmin && !isSecretarioOfTask) return;

      notifications.push({
        userId: user.id,
        userEmail: email,
        type: 'new_report',
        title: isAdmin ? '📋 Nuevo Reporte' : '📋 Nuevo Reporte en tu Área',
        body: `${createdByName} envió un reporte: "${reportTitle}" para la tarea "${taskTitle}"${taskArea ? ` (${taskArea})` : ''}`,
        taskId,
        reportId,
        area: taskArea,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    await Promise.all(notifications.map((notification) => addDoc(collection(db, 'notifications'), notification)));
  } catch (error) {
    if (__DEV__) console.error('Error notificando a admins:', error);
    // No lanzar error para no interrumpir el flujo del reporte
  }
};

/**
 * Create a report for a task with images and evidence
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID creating report
 * @param {Object} reportData - Report data (title, description, images)
 * @returns {Promise<string>} Report ID
 */
export const createTaskReport = async (taskId, userId, reportData) => {
  try {
    // Importar getCurrentSession para obtener datos del usuario actual
    const { getCurrentSession } = await import('./authFirestore');
    const sessionResult = await getCurrentSession();

    let createdByName = 'Usuario';
    let userEmail = '';
    let userRole = 'director';
    let userArea = '';
    let userSecretaria = '';

    if (sessionResult.success && sessionResult.session) {
      createdByName = sessionResult.session.displayName || sessionResult.session.email || 'Usuario';
      userEmail = sessionResult.session.email || '';
      userRole = sessionResult.session.role || 'director';
      userArea = sessionResult.session.area || '';
      userSecretaria = sessionResult.session.secretaria || sessionResult.session.area || '';
    } else {
      // Fallback: buscar por userId en la colección users
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        createdByName = userData.displayName || userData.email || 'Usuario';
        userEmail = userData.email || '';
        userRole = userData.role || 'director';
        userArea = userData.area || '';
        userSecretaria = userData.secretaria || userData.area || '';
      }
    }

    // Obtener info de la tarea para incluir el área de la tarea
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    const taskData = taskDoc.exists() ? taskDoc.data() : {};
    const taskArea = taskData.area || userArea;

    const report = {
      taskId,
      createdBy: (userEmail || userId).toLowerCase().trim(),
      createdByName: createdByName,
      createdByRole: userRole,
      createdByArea: userArea,
      createdBySecretaria: userSecretaria,
      area: taskArea, // Área de la tarea
      // Secretarías que pueden ver el reporte (las mismas que ven la tarea)
      secretarias: taskData.secretarias || [],
      title: reportData.title,
      description: reportData.description,
      images: reportData.images || [],
      rating: reportData.rating || null,
      ratingComment: reportData.ratingComment || '',
      status: 'submitted',
      attachments: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, 'task_reports'),
      report
    );

    // A partir de aquí el reporte YA existe. Lo que sigue es secundario: si falla, no debe
    // reportarse como error de envío (el usuario lo reenviaría y quedaría duplicado).
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        reports: arrayUnion(docRef.id),
        lastReportDate: serverTimestamp(),
      });
    } catch (linkError) {
      if (__DEV__) console.error('Error enlazando reporte a la tarea:', linkError);
    }

    logTaskActivity(taskId, userId, 'report_created', {
      reportId: docRef.id,
      title: report.title,
    }).catch(() => {});

    // Notificar a los admins y secretarios (sin hacer esperar al usuario)
    notifyAdminsOfNewReport(taskId, docRef.id, reportData.title, createdByName, { ...taskData, area: taskArea }, userEmail);

    return docRef.id;
  } catch (error) {
    if (__DEV__) console.error('Error creating task report:', error);
    throw error;
  }
};

// Tamaño máximo de una foto guardada dentro del reporte cuando Storage no está disponible.
// Un documento de Firestore admite 1 MB en total.
const MAX_EMBEDDED_IMAGE_CHARS = 350 * 1024;

/**
 * Sube el archivo a Storage. Intenta primero la carpeta de reportes y, si el proyecto
 * no la permite, la carpeta de imágenes de chat (la que hoy acepta escrituras).
 * @returns {Promise<string|null>} URL de descarga, o null si Storage no aceptó el archivo
 */
const uploadToStorage = async (blob, taskId, reportId, fileName) => {
  const paths = [
    `task_reports/${taskId}/${reportId}/${fileName}`,
    `chat-images/reporte_${reportId}_${fileName}`,
  ];
  for (const storagePath of paths) {
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (storageError) {
      if (__DEV__) console.warn(`⚠️ Storage rechazó ${storagePath}:`, storageError.code || storageError.message);
    }
  }
  return null;
};

/**
 * Upload image for task report
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @param {Object} imageData - { uri, dataUrl, base64, blob, uploadedBy }
 * @returns {Promise<string>} Download URL
 */
export const uploadReportImage = async (taskId, reportId, imageData) => {
  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

    let dataUrl = imageData.dataUrl
      || (imageData.base64 ? `data:image/jpeg;base64,${imageData.base64}` : null);
    if (!dataUrl && imageData.uri) {
      dataUrl = await uriToDataUrl(imageData.uri);
    }
    const blob = imageData.blob || (dataUrl ? dataUrlToBlob(dataUrl) : null);

    let downloadURL = blob ? await uploadToStorage(blob, taskId, reportId, fileName) : null;

    // Si Storage no aceptó el archivo, la foto se guarda dentro del propio reporte
    if (!downloadURL && dataUrl) {
      if (dataUrl.length > MAX_EMBEDDED_IMAGE_CHARS) {
        throw new Error('La foto es demasiado grande para enviarse. Intenta con otra o tómala de nuevo.');
      }
      downloadURL = dataUrl;
    }

    if (!downloadURL) {
      throw new Error('No se pudo leer la foto seleccionada');
    }

    // Update report with image URL
    // (dentro de arrayUnion no se permite serverTimestamp(): se usa la hora del dispositivo)
    await updateDoc(doc(db, 'task_reports', reportId), {
      images: arrayUnion({
        url: downloadURL,
        uploadedAt: new Date().toISOString(),
        uploadedBy: imageData.uploadedBy || null,
      }),
      updatedAt: serverTimestamp(),
    });

    return downloadURL;
  } catch (error) {
    if (__DEV__) console.error('❌ Error uploading report image:', error);
    throw error;
  }
};

/**
 * Rate/evaluate completed task
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @param {number} rating - Rating 1-5
 * @param {string} comment - Optional comment
 * @param {string} ratedBy - User ID rating
 * @returns {Promise<void>}
 */
export const rateTaskReport = async (taskId, reportId, rating, comment = '', ratedBy) => {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await updateDoc(doc(db, 'task_reports', reportId), {
      rating,
      ratingComment: comment,
      ratedBy,
      ratedAt: serverTimestamp(),
      status: 'rated',
      updatedAt: serverTimestamp(),
    });

    // Update task with rating
    await updateDoc(doc(db, 'tasks', taskId), {
      qualityRating: rating,
      ratedAt: serverTimestamp(),
    });

    // Log activity
    await logTaskActivity(taskId, ratedBy, 'report_rated', {
      reportId,
      rating,
      comment,
    });
  } catch (error) {
    if (__DEV__) console.error('Error rating task report:', error);
    throw error;
  }
};

/**
 * Get task reports with real-time updates
 * @param {string} taskId - Task ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTaskReports = (taskId, callback) => {
  const q = query(
    collection(db, 'task_reports'),
    where('taskId', '==', taskId)
  );

  return onSnapshot(q, (snapshot) => {
    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    // Sort by creation date descending
    reports.sort((a, b) => b.createdAt - a.createdAt);
    callback(reports);
  });
};

/**
 * Log task activity (audit trail)
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID performing action
 * @param {string} action - Action type (created, updated, completed, etc.)
 * @param {Object} details - Additional details
 * @returns {Promise<void>}
 */
export const logTaskActivity = async (taskId, userId, action, details = {}) => {
  try {
    await addDoc(collection(db, 'task_activity_log'), {
      taskId,
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    if (__DEV__) console.error('Error logging task activity:', error);
    throw error;
  }
};

/**
 * Get task activity history
 * @param {string} taskId - Task ID
 * @param {Function} callback - Callback for real-time updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTaskActivity = (taskId, callback) => {
  const q = query(
    collection(db, 'task_activity_log'),
    where('taskId', '==', taskId)
  );

  return onSnapshot(q, (snapshot) => {
    const activities = [];
    snapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    // Sort by timestamp descending (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    callback(activities);
  });
};

/**
 * Delete report
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export const deleteTaskReport = async (taskId, reportId) => {
  try {
    // Marcar el reporte como eliminado (soft delete)
    // Esto es más seguro que borrar directamente
    await updateDoc(doc(db, 'task_reports', reportId), {
      deleted: true,
      deletedAt: serverTimestamp(),
    });
    
    return { success: true, message: 'Reporte eliminado correctamente' };
  } catch (error) {
    if (__DEV__) console.error('Error eliminando reporte:', error);
    throw new Error(`No se pudo eliminar el reporte: ${error.message}`);
  }
};

/**
 * Get report statistics
 * @param {string} area - Area name (optional)
 * @returns {Promise<Object>} Statistics
 */
export const getReportStatistics = async (area = null, scope = null) => {
  try {
    let q;
    if (area) {
      q = query(
        collection(db, 'task_reports'),
        where('area', '==', area)
      );
    } else {
      q = collection(db, 'task_reports');
    }

    const snapshot = await getDocs(q);
    let reports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) {
        reports.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // scope = { user, tasks }: las estadísticas solo cuentan los reportes que ese usuario puede ver
    if (scope?.user) {
      reports = filterVisibleReports(reports, scope.tasks, scope.user);
    }

    // Calculate statistics
    const totalReports = reports.length;
    const ratedReports = reports.filter((r) => r.rating).length;
    const avgRating = ratedReports > 0
      ? (reports.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedReports).toFixed(2)
      : 0;
    const withImages = reports.filter((r) => r.images && r.images.length > 0).length;

    return {
      totalReports,
      ratedReports,
      avgRating: parseFloat(avgRating),
      withImages,
      reports,
    };
  } catch (error) {
    if (__DEV__) console.error('Error getting report statistics:', error);
    throw error;
  }
};

/**
 * Suscripción a los reportes sin filtrar ni enriquecer, del más reciente al más antiguo.
 * Quien la usa decide qué puede ver cada usuario con filterVisibleReports
 * (utils/taskVisibility.js) y las tareas que ya tiene cargadas, sin lecturas extra por tarea.
 * @param {Function} callback - Recibe la lista de reportes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToReports = (callback, onError) => {
  return onSnapshot(query(collection(db, 'task_reports')), (snapshot) => {
    const reports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) reports.push({ id: doc.id, ...data });
    });
    reports.sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0));
    callback(reports);
  }, onError);
};

/**
 * Subscribe to ALL reports in real-time (for admin view)
 * Includes area/origin information
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllReports = (callback, onError) => {
  const q = query(collection(db, 'task_reports'));

  return onSnapshot(q, async (snapshot) => {
    const reports = [];
    const taskIds = new Set();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) {
        reports.push({
          id: doc.id,
          ...data,
        });
        if (data.taskId) {
          taskIds.add(data.taskId);
        }
      }
    });

    // Get task info to add area data
    const tasksInfo = {};
    for (const taskId of taskIds) {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          const taskData = taskDoc.data();
          tasksInfo[taskId] = {
            title: taskData.title || 'Sin título',
            area: taskData.area || 'Sin área',
            assignedTo: taskData.assignedTo || [],
          };
        }
      } catch (err) {
      }
    }

    // Enrich reports with task info
    const enrichedReports = reports.map(report => ({
      ...report,
      taskInfo: tasksInfo[report.taskId] || { title: 'Tarea no encontrada', area: 'Desconocida' },
    }));

    // Sort by creation date descending
    enrichedReports.sort((a, b) => {
      const dateA = toMs(a.createdAt) || 0;
      const dateB = toMs(b.createdAt) || 0;
      return dateB - dateA;
    });

    callback(enrichedReports);
  }, onError);
};

