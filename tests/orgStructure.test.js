// tests/orgStructure.test.js
// Organigrama editable: mover una dirección cambia a qué secretaría pertenece y, con eso,
// qué secretario ve sus tareas y a quién puede delegar.

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), doc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(),
  query: jest.fn(), setDoc: jest.fn(), where: jest.fn(), writeBatch: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));
jest.mock('../services/Logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }));

import {
  SECRETARIAS,
  DIRECCIONES,
  TODAS_LAS_AREAS,
  applyOrgStructure,
  getDireccionesBySecretaria,
  getOrgStructure,
  getSecretariaByDireccion,
  getSecretariasForAreas,
  moveDireccionInStructure,
  resetOrgStructure,
  sanitizeOrgStructure,
  addSecretariaToStructure,
  getAreaNameError,
  moveSecretariaInStructure,
  removeAreaFromStructure,
  renameAreaInStructure,
} from '../config/areas';
import { canUserSeeTask } from '../utils/taskVisibility';
import { isDirectorOfSecretario } from '../services/roles';
import {
  planUserUpdates, computeTaskSecretarias, planUserRenames, planTaskRenames,
} from '../services/orgStructure';

const TURISMO = 'Dirección de Turismo';
const ECONOMIA = 'Secretaría de Desarrollo Económico y Turismo';
const BIENESTAR = 'Secretaría de Bienestar Social';

afterEach(() => resetOrgStructure());

describe('moveDireccionInStructure', () => {
  test('mueve la dirección a otra secretaría sin tocar el original', () => {
    const original = getOrgStructure();
    const { structure, fromSecretaria, changed } = moveDireccionInStructure(original, TURISMO, BIENESTAR);

    expect(changed).toBe(true);
    expect(fromSecretaria).toBe(ECONOMIA);
    const find = (s, name) => s.secretarias.find((sec) => sec.nombre === name).direcciones;
    expect(find(structure, ECONOMIA)).not.toContain(TURISMO);
    expect(find(structure, BIENESTAR)).toContain(TURISMO);
    expect(find(original, ECONOMIA)).toContain(TURISMO);
  });

  test('coloca la dirección en la posición indicada', () => {
    const { structure } = moveDireccionInStructure(getOrgStructure(), TURISMO, BIENESTAR, 1);
    const bienestar = structure.secretarias.find((sec) => sec.nombre === BIENESTAR).direcciones;
    expect(bienestar[1]).toBe(TURISMO);
  });

  test('cambia el orden dentro de la misma secretaría', () => {
    const before = getDireccionesBySecretaria(ECONOMIA);
    expect(before[0]).toBe(TURISMO);
    // Soltarla después de la última
    const { structure, changed } = moveDireccionInStructure(getOrgStructure(), TURISMO, ECONOMIA, before.length);
    const after = structure.secretarias.find((sec) => sec.nombre === ECONOMIA).direcciones;
    expect(changed).toBe(true);
    expect(after[after.length - 1]).toBe(TURISMO);
    expect(after).toHaveLength(before.length);
  });

  test('soltarla donde ya estaba no cambia nada', () => {
    expect(moveDireccionInStructure(getOrgStructure(), TURISMO, ECONOMIA, 0).changed).toBe(false);
    expect(moveDireccionInStructure(getOrgStructure(), TURISMO, ECONOMIA, 1).changed).toBe(false);
  });

  test('una secretaría o dirección inexistente no cambia nada', () => {
    expect(moveDireccionInStructure(getOrgStructure(), TURISMO, 'No existe').changed).toBe(false);
    expect(moveDireccionInStructure(getOrgStructure(), 'No existe', BIENESTAR).changed).toBe(false);
  });
});

describe('applyOrgStructure', () => {
  test('las listas exportadas reflejan el organigrama nuevo', () => {
    const { structure } = moveDireccionInStructure(getOrgStructure(), TURISMO, BIENESTAR);
    expect(applyOrgStructure(structure)).toBe(true);

    expect(getSecretariaByDireccion(TURISMO)).toBe(BIENESTAR);
    expect(getDireccionesBySecretaria(BIENESTAR)).toContain(TURISMO);
    expect(getDireccionesBySecretaria(ECONOMIA)).not.toContain(TURISMO);
    expect(getSecretariasForAreas([TURISMO])).toEqual([BIENESTAR]);
    expect(DIRECCIONES).toContain(TURISMO);
    expect(TODAS_LAS_AREAS).toContain(TURISMO);
  });

  test('agregar una secretaría nueva la deja disponible en toda la app', () => {
    const structure = getOrgStructure();
    structure.secretarias.push({ nombre: 'Secretaría de Prueba', direcciones: ['Dirección de Prueba'] });
    applyOrgStructure(structure);

    expect(SECRETARIAS).toContain('Secretaría de Prueba');
    expect(getSecretariaByDireccion('Dirección de Prueba')).toBe('Secretaría de Prueba');
    expect(TODAS_LAS_AREAS).toContain('Dirección de Prueba');
  });

  test('un organigrama con forma incorrecta se ignora', () => {
    const before = getOrgStructure();
    expect(applyOrgStructure(null)).toBe(false);
    expect(applyOrgStructure({ secretarias: 'x' })).toBe(false);
    expect(applyOrgStructure({ secretarias: [] })).toBe(false);
    expect(getOrgStructure()).toEqual(before);
  });

  test('una dirección repetida queda solo en la primera secretaría', () => {
    const clean = sanitizeOrgStructure({
      secretarias: [
        { nombre: ' A ', direcciones: ['X', 'X', ' Y '] },
        { nombre: 'B', direcciones: ['X', 'Z'] },
        { nombre: 'A', direcciones: ['W'] },
      ],
    });
    expect(clean).toEqual({
      secretarias: [
        { nombre: 'A', direcciones: ['X', 'Y'] },
        { nombre: 'B', direcciones: ['Z'] },
      ],
    });
  });
});

describe('las restricciones siguen al organigrama', () => {
  const secretarioEconomia = { role: 'secretario', email: 'eco@m.com', area: ECONOMIA, direcciones: [] };
  const secretarioBienestar = { role: 'secretario', email: 'bien@m.com', area: BIENESTAR, direcciones: [] };
  const directorTurismo = { role: 'director', email: 'tur@m.com', area: TURISMO };
  // Tarea antigua, sin el campo `secretarias`: la visibilidad se resuelve por el área
  const tarea = { id: 't1', area: TURISMO, assignedTo: ['tur@m.com'] };

  test('antes de mover: la ve y delega el secretario de origen', () => {
    expect(canUserSeeTask(tarea, secretarioEconomia)).toBe(true);
    expect(canUserSeeTask(tarea, secretarioBienestar)).toBe(false);
    expect(isDirectorOfSecretario(directorTurismo, secretarioEconomia)).toBe(true);
    expect(isDirectorOfSecretario(directorTurismo, secretarioBienestar)).toBe(false);
  });

  test('después de mover: pasa al secretario de destino', () => {
    applyOrgStructure(moveDireccionInStructure(getOrgStructure(), TURISMO, BIENESTAR).structure);

    expect(canUserSeeTask(tarea, secretarioBienestar)).toBe(true);
    expect(canUserSeeTask(tarea, secretarioEconomia)).toBe(false);
    expect(isDirectorOfSecretario(directorTurismo, secretarioBienestar)).toBe(true);
    expect(isDirectorOfSecretario(directorTurismo, secretarioEconomia)).toBe(false);
    // El director sigue viendo sus propias tareas
    expect(canUserSeeTask(tarea, directorTurismo)).toBe(true);
  });
});

describe('planUserUpdates', () => {
  const users = [
    { id: 'sec-eco', role: 'secretario', area: ECONOMIA, direcciones: [TURISMO, 'Dirección de Desarrollo Económico'], areasPermitidas: [ECONOMIA, TURISMO] },
    { id: 'sec-bien', role: 'secretario', area: BIENESTAR, direcciones: ['Dirección de Cultura'], areasPermitidas: [] },
    { id: 'dir-tur', role: 'director', area: TURISMO, secretaria: ECONOMIA },
    { id: 'dir-cultura', role: 'director', area: 'Dirección de Cultura', secretaria: BIENESTAR },
    { id: 'admin', role: 'admin', area: '' },
  ];

  test('quita la dirección al secretario de origen, la da al de destino y readscribe al titular', () => {
    const updates = planUserUpdates(users, TURISMO, ECONOMIA, BIENESTAR);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.data]));

    expect(byId['sec-eco']).toEqual({
      direcciones: ['Dirección de Desarrollo Económico'],
      areasPermitidas: [ECONOMIA],
    });
    expect(byId['sec-bien']).toEqual({ direcciones: ['Dirección de Cultura', TURISMO] });
    expect(byId['dir-tur']).toEqual({ secretaria: BIENESTAR });
    expect(byId['dir-cultura']).toBeUndefined();
    expect(byId.admin).toBeUndefined();
  });

  test('volver a aplicarlo no genera más cambios', () => {
    const updates = planUserUpdates(users, TURISMO, ECONOMIA, BIENESTAR);
    const patched = users.map((user) => ({ ...user, ...(updates.find((u) => u.id === user.id)?.data || {}) }));
    expect(planUserUpdates(patched, TURISMO, ECONOMIA, BIENESTAR)).toEqual([]);
  });
});

describe('renombrar', () => {
  const NUEVO = 'Dirección de Turismo y Pueblos Mágicos';

  test('el organigrama cambia el nombre y conserva el lugar', () => {
    const { structure, changed } = renameAreaInStructure(getOrgStructure(), TURISMO, NUEVO);
    expect(changed).toBe(true);
    expect(structure.secretarias.find((sec) => sec.nombre === ECONOMIA).direcciones[0]).toBe(NUEVO);
    expect(renameAreaInStructure(getOrgStructure(), 'No existe', NUEVO).changed).toBe(false);
  });

  test('no acepta nombres vacíos ni repetidos', () => {
    const structure = getOrgStructure();
    expect(getAreaNameError(structure, '  ')).toBeTruthy();
    expect(getAreaNameError(structure, 'dirección de cultura', TURISMO)).toBeTruthy();
    expect(getAreaNameError(structure, BIENESTAR, TURISMO)).toBeTruthy();
    expect(getAreaNameError(structure, 'SMDIF')).toBeTruthy();
    expect(getAreaNameError(structure, 'Contraloría')).toBeTruthy();
    expect(getAreaNameError(structure, NUEVO, TURISMO)).toBeNull();
    expect(getAreaNameError(structure, 'DIRECCIÓN DE TURISMO', TURISMO)).toBeNull();
  });

  test('los usuarios pasan al nombre nuevo', () => {
    const users = [
      { id: 'sec-eco', role: 'secretario', area: ECONOMIA, direcciones: [TURISMO, 'Dirección de Desarrollo Económico'], areasPermitidas: [ECONOMIA, TURISMO] },
      { id: 'dir-tur', role: 'director', area: TURISMO, department: TURISMO, secretaria: ECONOMIA },
      { id: 'dir-cultura', role: 'director', area: 'Dirección de Cultura', secretaria: BIENESTAR },
    ];
    const updates = planUserRenames(users, TURISMO, NUEVO);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.data]));

    expect(byId['sec-eco']).toEqual({
      direcciones: [NUEVO, 'Dirección de Desarrollo Económico'],
      areasPermitidas: [ECONOMIA, NUEVO],
    });
    expect(byId['dir-tur']).toEqual({ area: NUEVO, department: NUEVO });
    expect(byId['dir-cultura']).toBeUndefined();

    const patched = users.map((user) => ({ ...user, ...(byId[user.id] || {}) }));
    expect(planUserRenames(patched, TURISMO, NUEVO)).toEqual([]);
  });

  test('renombrar una secretaría cambia la adscripción y las tareas que la nombran', () => {
    const NUEVA = 'Secretaría de Economía';
    expect(planUserRenames([{ id: 'dir-tur', area: TURISMO, secretaria: ECONOMIA }], ECONOMIA, NUEVA))
      .toEqual([{ id: 'dir-tur', data: { secretaria: NUEVA } }]);
    expect(planTaskRenames([{ id: 't1', area: TURISMO, areas: [TURISMO], secretarias: [ECONOMIA, BIENESTAR] }], ECONOMIA, NUEVA))
      .toEqual([{ id: 't1', data: { secretarias: [NUEVA, BIENESTAR] } }]);
  });

  test('las tareas pasan al nombre nuevo, también las guardadas con una variante', () => {
    const tasks = [
      { id: 't1', area: TURISMO, areas: [TURISMO, 'Dirección de Cultura'], secretarias: [ECONOMIA, BIENESTAR] },
      { id: 't2', area: 'Dirección de Cultura', areas: ['Dirección de Cultura'] },
    ];
    expect(planTaskRenames(tasks, TURISMO, NUEVO)).toEqual([
      { id: 't1', data: { area: NUEVO, areas: [NUEVO, 'Dirección de Cultura'] } },
    ]);
    expect(planTaskRenames([{ id: 't3', area: 'Dirección Jurídico' }], 'Dirección Jurídica', 'Dirección Legal'))
      .toEqual([{ id: 't3', data: { area: 'Dirección Legal' } }]);
  });
});

describe('secretarías', () => {
  test('agregar una secretaría la pone al final, sin direcciones', () => {
    const { structure, changed } = addSecretariaToStructure(getOrgStructure(), ' Secretaría de Prueba ');
    expect(changed).toBe(true);
    expect(structure.secretarias[structure.secretarias.length - 1]).toEqual({ nombre: 'Secretaría de Prueba', direcciones: [] });
    expect(addSecretariaToStructure(getOrgStructure(), BIENESTAR).changed).toBe(false);
  });

  test('cambiar de lugar una secretaría conserva sus direcciones', () => {
    const original = getOrgStructure();
    const { structure, changed } = moveSecretariaInStructure(original, BIENESTAR, 0);
    expect(changed).toBe(true);
    expect(structure.secretarias[0].nombre).toBe(BIENESTAR);
    expect(structure.secretarias[0].direcciones).toContain('Dirección de Cultura');
    expect(structure.secretarias).toHaveLength(original.secretarias.length);
    expect(moveSecretariaInStructure(original, original.secretarias[0].nombre, -1).changed).toBe(false);
  });

  test('solo se elimina una secretaría sin direcciones', () => {
    const VACIA = 'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas';
    expect(removeAreaFromStructure(getOrgStructure(), BIENESTAR).changed).toBe(false);
    const { structure, changed } = removeAreaFromStructure(getOrgStructure(), VACIA);
    expect(changed).toBe(true);
    expect(structure.secretarias.map((sec) => sec.nombre)).not.toContain(VACIA);
    expect(removeAreaFromStructure({ secretarias: [{ nombre: 'Única', direcciones: [] }] }, 'Única').changed).toBe(false);
  });

  test('eliminar una dirección la quita de su secretaría', () => {
    const { structure, changed } = removeAreaFromStructure(getOrgStructure(), TURISMO);
    expect(changed).toBe(true);
    expect(structure.secretarias.find((sec) => sec.nombre === ECONOMIA).direcciones).not.toContain(TURISMO);
  });
});

describe('computeTaskSecretarias', () => {
  test('usa el organigrama vigente y la secretaría de los asignados', () => {
    applyOrgStructure(moveDireccionInStructure(getOrgStructure(), TURISMO, BIENESTAR).structure);
    const task = { area: TURISMO, areas: [TURISMO], assignedTo: ['tur@m.com', 'otro@m.com'] };

    expect(computeTaskSecretarias(task, { 'tur@m.com': BIENESTAR })).toEqual([BIENESTAR]);
    expect(computeTaskSecretarias(task, { 'tur@m.com': BIENESTAR, 'otro@m.com': ECONOMIA }).sort())
      .toEqual([BIENESTAR, ECONOMIA].sort());
  });
});
