import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { resolveAreaName, getDireccionesBySecretaria } from '../config/areas';

import { ROLES } from './permissions';

// Roles disponibles en el sistema (definidos en permissions.js)
export { ROLES };

// Nombre canónico de un área en minúsculas, para comparar sin depender de alias ni mayúsculas
const areaKey = (name) => resolveAreaName((name || '').trim()).toLowerCase();

/**
 * ¿Es el usuario titular de esa área? Coincidencia exacta (tras resolver alias):
 * elegir una dirección NO trae a las demás direcciones de la misma secretaría.
 *   - secretario: su área es su secretaría (sus direcciones no lo hacen titular de ellas)
 *   - director: su dirección está en areasPermitidas; si no tiene, en area
 */
export const isTitularOfArea = (user, area) => {
  const target = areaKey(area);
  if (!target || !user) return false;

  const ownArea = areaKey(user.area || user.department);
  if (user.role === 'secretario') return ownArea === target;

  const permitidas = (user.areasPermitidas || []).map(areaKey).filter(Boolean);
  return permitidas.length > 0 ? permitidas.includes(target) : ownArea === target;
};

/**
 * ¿Está el director adscrito a la secretaría de este secretario?
 * Se usa para limitar a quién puede delegar un secretario.
 */
export const isDirectorOfSecretario = (director, secretario) => {
  const secretaria = resolveAreaName((secretario?.area || secretario?.department || '').trim());
  if (!secretaria || !director) return false;

  const scope = new Set(
    [secretaria, ...getDireccionesBySecretaria(secretaria), ...(secretario.direcciones || [])]
      .map(areaKey)
      .filter(Boolean)
  );
  return [director.secretaria, director.area, ...(director.areasPermitidas || [])]
    .map(areaKey)
    .some(key => key && scope.has(key));
};

// Obtener titulares (directores/secretarios) de áreas específicas
export const getTitularesByAreas = async (areas) => {
  try {
    if (!areas || areas.length === 0) return [];
    
    // Obtener todos los usuarios activos que son directores o secretarios
    const q = query(
      collection(db, 'users'),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Solo directores y secretarios que son titulares EXACTAMENTE de las áreas seleccionadas
    return allUsers.filter(user =>
      ['director', 'secretario'].includes(user.role) &&
      areas.some(area => isTitularOfArea(user, area))
    );
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo titulares por áreas:', error);
    return [];
  }
};
