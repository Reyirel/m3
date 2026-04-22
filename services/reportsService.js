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

const storage = getStorage();

/**
 * Notificar a los admins y secretarios sobre un nuevo reporte
 */
const notifyAdminsOfNewReport = async (taskId, reportId, reportTitle, createdByName, reportArea = '') => {
  try {
    // Obtener info de la tarea
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    const taskData = taskDoc.exists() ? taskDoc.data() : {};
    const taskTitle = taskData.title || 'Tarea sin título';
    const taskArea = taskData.area || reportArea;

    // Obtener todos los admins
    const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminsSnapshot = await getDocs(adminsQuery);

    // Obtener secretarios del área correspondiente
    const secretariosQuery = query(collection(db, 'users'), where('role', '==', 'secretario'));
    const secretariosSnapshot = await getDocs(secretariosQuery);

    // Crear notificación para cada admin
    const notifications = [];
    adminsSnapshot.forEach((adminDoc) => {
      const adminData = adminDoc.data();
      notifications.push({
        userId: adminDoc.id,
        userEmail: adminData.email,
        type: 'new_report',
        title: '📋 Nuevo Reporte',
        body: `${createdByName} envió un reporte: "${reportTitle}" para la tarea "${taskTitle}" (${taskArea})`,
        taskId,
        reportId,
        area: taskArea,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // Notificar a secretarios si el reporte viene de su área
    secretariosSnapshot.forEach((secDoc) => {
      const secData = secDoc.data();
      const secAreasPermitidas = secData.areasPermitidas || [secData.area];
      
      // Si la tarea pertenece a una de las áreas del secretario (case-insensitive)
      if (secAreasPermitidas.some(a => a?.toLowerCase().trim() === taskArea?.toLowerCase().trim())) {
        notifications.push({
          userId: secDoc.id,
          userEmail: secData.email,
          type: 'new_report',
          title: '📋 Nuevo Reporte en tu Área',
          body: `${createdByName} envió un reporte: "${reportTitle}" para la tarea "${taskTitle}"`,
          taskId,
          reportId,
          area: taskArea,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    });

    // Guardar todas las notificaciones
    for (const notification of notifications) {
      await addDoc(collection(db, 'notifications'), notification);
    }

  } catch (error) {
    console.error('Error notificando a admins:', error);
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

    // Add report reference to task
    await updateDoc(doc(db, 'tasks', taskId), {
      reports: arrayUnion(docRef.id),
      lastReportDate: serverTimestamp(),
    });

    // Log activity
    await logTaskActivity(taskId, userId, 'report_created', {
      reportId: docRef.id,
      title: report.title,
    });

    // Notificar a los admins y secretarios
    await notifyAdminsOfNewReport(taskId, docRef.id, reportData.title, createdByName, taskArea);

    return docRef.id;
  } catch (error) {
    console.error('Error creating task report:', error);
    throw error;
  }
};

/**
 * Upload image for task report
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @param {Object} imageData - Image data with uri
 * @returns {Promise<string>} Download URL
 */
export const uploadReportImage = async (taskId, reportId, imageData) => {
  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const storagePath = `task_reports/${taskId}/${reportId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Convert various formats to blob
    let blob = imageData.blob;
    let dataUrl = imageData.dataUrl || null;  // Usar el dataUrl que viene como parámetro
    
    // Si no hay blob, convertir de uri o base64
    if (!blob) {
      if (imageData.base64) {
        // Convertir base64 a blob
        dataUrl = dataUrl || `data:image/jpeg;base64,${imageData.base64}`;
        try {
          const bstr = atob(imageData.base64);
          const n = bstr.length;
          const u8arr = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          blob = new Blob([u8arr], { type: 'image/jpeg' });
        } catch (decodeError) {
          console.warn('⚠️ Could not decode base64:', decodeError);
        }
      } else if (imageData.uri && !dataUrl) {
        // Convertir URI de imagen (expo-image-picker) a blob
        try {
          const response = await fetch(imageData.uri);
          blob = await response.blob();
          
          // También crear dataUrl como fallback
          const reader = new FileReader();
          dataUrl = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch URI:', fetchError);
        }
      }
    }

    let downloadURL = null;
    
    // Intentar subir a Storage
    if (blob) {
      try {
        await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(storageRef);
      } catch (storageError) {
        console.warn('⚠️ Storage upload failed:', storageError.message);
      }
    }

    // Si Storage falló, usar dataUrl como fallback (imágen embebida)
    if (!downloadURL && dataUrl) {
      downloadURL = dataUrl;
    }

    if (!downloadURL) {
      throw new Error('No valid image data could be processed - no Storage or dataUrl available');
    }

    // Update report with image URL
    await updateDoc(doc(db, 'task_reports', reportId), {
      images: arrayUnion({
        url: downloadURL,
        uploadedAt: serverTimestamp(),
        uploadedBy: imageData.uploadedBy,
      }),
      updatedAt: serverTimestamp(),
    });

    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading report image:', error);
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
    console.error('Error rating task report:', error);
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
 * Get all reports for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of reports
 */
export const getUserReports = async (userId) => {
  try {
    const q = query(
      collection(db, 'task_reports'),
      where('createdBy', '==', userId)
    );

    const snapshot = await getDocs(q);
    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return reports;
  } catch (error) {
    console.error('Error getting user reports:', error);
    throw error;
  }
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
    console.error('Error logging task activity:', error);
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
    console.error('Error eliminando reporte:', error);
    throw new Error(`No se pudo eliminar el reporte: ${error.message}`);
  }
};

/**
 * Get report statistics
 * @param {string} area - Area name (optional)
 * @returns {Promise<Object>} Statistics
 */
export const getReportStatistics = async (area = null) => {
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
    const reports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) {
        reports.push({
          id: doc.id,
          ...data,
        });
      }
    });

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
    console.error('Error getting report statistics:', error);
    throw error;
  }
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

/**
 * Get reports grouped by area/origin
 * @returns {Promise<Object>} Reports grouped by area
 */
export const getReportsGroupedByArea = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'task_reports'));
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

    // Get task info
    const tasksInfo = {};
    for (const taskId of taskIds) {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          const taskData = taskDoc.data();
          tasksInfo[taskId] = {
            title: taskData.title || 'Sin título',
            area: taskData.area || 'Sin área',
          };
        }
      } catch (err) {
      }
    }

    // Group by area
    const grouped = {};
    reports.forEach(report => {
      const area = tasksInfo[report.taskId]?.area || 'Sin área';
      if (!grouped[area]) {
        grouped[area] = [];
      }
      grouped[area].push({
        ...report,
        taskTitle: tasksInfo[report.taskId]?.title || 'Tarea sin título',
      });
    });

    return grouped;
  } catch (error) {
    console.error('Error getting grouped reports:', error);
    throw error;
  }
};

/**
 * Subscribe to reports for specific areas (for secretarios)
 * @param {Array<string>} areas - List of area names to watch
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAreaReports = (areas, callback, onError) => {
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

    // Get task info to filter by area
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

    // Filter reports by allowed areas (case-insensitive)
    const filteredReports = reports.filter(report => {
      const taskArea = (report.area || tasksInfo[report.taskId]?.area || '').toLowerCase().trim();
      return areas.some(a => a?.toLowerCase().trim() === taskArea);
    });

    // Enrich reports with task info
    const enrichedReports = filteredReports.map(report => ({
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

/**
 * Subscribe to reports created by a specific user (for directors to see their own)
 * @param {string} userEmail - User email
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToMyReports = (userEmail, callback, onError) => {
  const q = query(
    collection(db, 'task_reports'),
    where('createdBy', '==', userEmail.toLowerCase())
  );

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

    // Get task info
    const tasksInfo = {};
    for (const taskId of taskIds) {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          const taskData = taskDoc.data();
          tasksInfo[taskId] = {
            title: taskData.title || 'Sin título',
            area: taskData.area || 'Sin área',
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
