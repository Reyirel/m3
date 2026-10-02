// tests/taskVisibility.test.js
// Visibilidad de tareas por rol, permisos de cambio de estado y titulares por área.
// Usa config/areas.js real: son las reglas que deciden quién ve qué.

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../services/authFirestore', () => ({
  getCurrentSession: jest.fn(async () => ({ success: false })),
}));

import { canUserSeeTask, filterVisibleTasks } from '../utils/taskVisibility';
import { haveAllAssigneesConfirmed, getAssignedEmails } from '../utils/taskHelpers';
import { getSecretariasForAreas } from '../config/areas';
import { canChangeTaskStatus } from '../services/permissions';
import { isTitularOfArea, isDirectorOfSecretario } from '../services/roles';

const OBRAS = 'Secretaría de Obras Públicas y Desarrollo Urbano';
const TESORERIA = 'Secretaría de Tesorería Municipal';
const ECONOMICO = 'Secretaría de Desarrollo Económico y Turismo';

const admin = { role: 'admin', email: 'admin@test.com' };
const secObras = { role: 'secretario', email: 'obras@test.com', area: OBRAS, direcciones: [] };
const secTesoreria = { role: 'secretario', email: 'tesoreria@test.com', area: TESORERIA, direcciones: [] };
const dirObras = {
  role: 'director',
  email: 'gladys@test.com',
  area: OBRAS,
  secretaria: OBRAS,
  areasPermitidas: ['Dirección de Obras Públicas'],
};
const dirCatastro = {
  role: 'director',
  email: 'catastro@test.com',
  area: TESORERIA,
  secretaria: TESORERIA,
  areasPermitidas: ['Dirección de Catastro'],
};

describe('getSecretariasForAreas', () => {
  test('una dirección devuelve su secretaría', () => {
    expect(getSecretariasForAreas(['Dirección de Catastro'])).toEqual([TESORERIA]);
  });

  test('varias áreas devuelven cada secretaría una sola vez', () => {
    expect(getSecretariasForAreas(['Dirección de Catastro', 'Dirección de Obras Públicas', OBRAS]))
      .toEqual([TESORERIA, OBRAS]);
  });

  test('resuelve alias y áreas sin secretaría', () => {
    expect(getSecretariasForAreas(['Dirección de Obra Pública'])).toEqual([OBRAS]);
    expect(getSecretariasForAreas(['SMDIF'])).toEqual(['SMDIF']);
    expect(getSecretariasForAreas([null, ''])).toEqual([]);
  });
});

describe('canUserSeeTask', () => {
  const taskCatastro = {
    id: '1',
    area: 'Dirección de Catastro',
    areas: ['Dirección de Catastro'],
    secretarias: [TESORERIA],
    assignedTo: ['catastro@test.com'],
  };

  test('admin ve todas', () => {
    expect(canUserSeeTask(taskCatastro, admin)).toBe(true);
  });

  test('director solo ve las asignadas a su correo', () => {
    expect(canUserSeeTask(taskCatastro, dirCatastro)).toBe(true);
    expect(canUserSeeTask(taskCatastro, dirObras)).toBe(false);
  });

  test('director no ve tareas de su propia secretaría si no está asignado', () => {
    const task = { area: OBRAS, secretarias: [OBRAS], assignedTo: ['otro@test.com'] };
    expect(canUserSeeTask(task, dirObras)).toBe(false);
  });

  test('secretario ve las de su secretaría y no las de otra', () => {
    expect(canUserSeeTask(taskCatastro, secTesoreria)).toBe(true);
    expect(canUserSeeTask(taskCatastro, secObras)).toBe(false);
  });

  test('secretario ve una tarea de varias áreas aunque la suya no sea la primera', () => {
    const task = {
      area: 'Dirección de Catastro',
      areas: ['Dirección de Catastro', 'Dirección de Obras Públicas'],
      assignedTo: ['catastro@test.com'],
    };
    expect(canUserSeeTask(task, secObras)).toBe(true);
    expect(canUserSeeTask(task, secTesoreria)).toBe(true);
  });

  test('secretario ve tareas guardadas con un alias de su dirección', () => {
    const task = { area: 'Dirección de Obra Pública', assignedTo: ['x@test.com'] };
    expect(canUserSeeTask(task, secObras)).toBe(true);
  });

  test('secretario ve la tarea de otra área asignada a uno de sus directores', () => {
    const task = {
      area: 'Dirección de Catastro',
      secretarias: [TESORERIA, OBRAS],
      assignedTo: ['gladys@test.com'],
    };
    expect(canUserSeeTask(task, secObras)).toBe(true);
  });

  test('la papelera no se muestra a nadie', () => {
    const tasks = [taskCatastro, { ...taskCatastro, id: '2', deleted: true }];
    expect(filterVisibleTasks(tasks, admin).map(t => t.id)).toEqual(['1']);
  });

  test('sin rol no ve nada', () => {
    expect(canUserSeeTask(taskCatastro, { email: 'catastro@test.com' })).toBe(false);
  });
});

describe('confirmaciones con varios asignados', () => {
  const base = { status: 'en_proceso', assignedTo: ['gladys@test.com', 'catastro@test.com'] };

  test('assignedTo se normaliza y no repite', () => {
    expect(getAssignedEmails({ assignedTo: [' A@Test.com', 'a@test.com'] })).toEqual(['a@test.com']);
    expect(getAssignedEmails({ assignedTo: 'a@test.com' })).toEqual(['a@test.com']);
  });

  test('la confirmación de alguien que ya no está asignado no cuenta', () => {
    const task = { ...base, completedBy: [{ email: 'gladys@test.com' }, { email: 'exasignado@test.com' }] };
    expect(haveAllAssigneesConfirmed(task)).toBe(false);
  });

  test('todos confirmaron', () => {
    const task = { ...base, completedBy: [{ email: 'gladys@test.com' }, { email: 'CATASTRO@test.com' }] };
    expect(haveAllAssigneesConfirmed(task)).toBe(true);
  });

  test('un asignado no puede mandar a revisión si faltan confirmaciones', () => {
    const task = { ...base, completedBy: [{ email: 'gladys@test.com' }] };
    expect(canChangeTaskStatus(dirObras, task, 'en_revision').canChange).toBe(false);
    expect(canChangeTaskStatus({ ...secObras, email: 'gladys@test.com' }, task, 'en_revision').canChange).toBe(false);
  });

  test('con un solo asignado sí puede mandar a revisión', () => {
    const task = { status: 'en_proceso', assignedTo: ['gladys@test.com'] };
    expect(canChangeTaskStatus(dirObras, task, 'en_revision').canChange).toBe(true);
  });

  test('solo el admin puede finalizar', () => {
    const task = { status: 'en_revision', assignedTo: ['gladys@test.com'] };
    expect(canChangeTaskStatus(dirObras, task, 'cerrada').canChange).toBe(false);
    expect(canChangeTaskStatus({ ...secObras, email: 'gladys@test.com' }, task, 'cerrada').canChange).toBe(false);
    expect(canChangeTaskStatus(admin, task, 'cerrada').canChange).toBe(true);
  });
});

describe('titulares por área', () => {
  const dirTurismo = { role: 'director', area: ECONOMICO, areasPermitidas: ['Dirección de Turismo'] };
  const dirEconomico = { role: 'director', area: ECONOMICO, areasPermitidas: ['Dirección de Desarrollo Económico'] };
  const secEconomico = { role: 'secretario', area: ECONOMICO, direcciones: ['Dirección de Turismo'] };

  test('elegir una dirección solo trae a su director', () => {
    expect(isTitularOfArea(dirEconomico, 'Dirección de Desarrollo Económico')).toBe(true);
    expect(isTitularOfArea(dirTurismo, 'Dirección de Desarrollo Económico')).toBe(false);
    expect(isTitularOfArea(secEconomico, 'Dirección de Desarrollo Económico')).toBe(false);
  });

  test('elegir la secretaría trae al secretario, no a todos sus directores', () => {
    expect(isTitularOfArea(secEconomico, ECONOMICO)).toBe(true);
    expect(isTitularOfArea(dirTurismo, ECONOMICO)).toBe(false);
  });

  test('director sin areasPermitidas usa su área', () => {
    const dir = { role: 'director', area: 'Dirección Jurídica' };
    expect(isTitularOfArea(dir, 'Director Jurídico')).toBe(true);
  });

  test('un secretario solo delega a directores de su secretaría', () => {
    expect(isDirectorOfSecretario(dirObras, secObras)).toBe(true);
    expect(isDirectorOfSecretario(dirCatastro, secObras)).toBe(false);
  });
});
