// tests/aiFeatures.test.js
// Sugerencias del formulario de tarea: prioridad, subtareas, fecha, área y duplicadas.

import {
  findSimilarTasks, generateSubtasks, suggestDueDate, suggestPriority, suggestTaskMetadata,
} from '../utils/aiFeatures';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const OBRAS = 'Dirección de Obras Públicas';

describe('prioridad sugerida', () => {
  test('una urgencia sugiere prioridad alta y explica por qué', () => {
    const result = suggestPriority('Atender fuga urgente en la colonia Centro');
    expect(result.priority).toBe('alta');
    expect(result.reason).toContain('urgente');
  });

  test('compara palabras completas: "playa" o "apoyo" no cuentan como urgencia', () => {
    expect(suggestPriority('Limpieza de la playa municipal').priority).toBeNull();
    expect(suggestPriority('Apoyo a la escuela primaria').priority).toBeNull();
  });

  test('solo usa las prioridades que existen en la app', () => {
    ['Emergencia por inundación', 'Licitación de luminarias', 'Seguimiento del padrón', 'Pintar bancas'].forEach((title) => {
      expect(['alta', 'media', null]).toContain(suggestPriority(title).priority);
    });
  });

  test('sin pistas en el texto no sugiere nada', () => {
    expect(suggestPriority('Pintar bancas').priority).toBeNull();
    expect(suggestPriority('').priority).toBeNull();
  });
});

describe('subtareas sugeridas', () => {
  test('reconoce el tipo de tarea aunque venga en plural o con otra palabra', () => {
    expect(generateSubtasks('Reparar luminarias de la avenida Juárez').category).toBe('Alumbrado');
    expect(generateSubtasks('Bacheo en la calle Hidalgo').category).toBe('Pavimentación');
    expect(generateSubtasks('Licitación de equipo de cómputo').category).toBe('Licitación');
  });

  test('el título pesa más que la descripción', () => {
    const result = generateSubtasks('Organizar feria del pueblo', 'Incluye un informe al terminar');
    expect(result.category).toBe('Evento');
  });

  test('si no reconoce el tipo, da pasos generales con confianza baja', () => {
    const result = generateSubtasks('Pintar bancas');
    expect(result.category).toBe('General');
    expect(result.confidence).toBe('baja');
    expect(result.subtasks.length).toBeGreaterThan(3);
  });
});

describe('fecha límite sugerida', () => {
  test('usa lo que tardaron tareas parecidas ya cerradas de la misma área', () => {
    const history = [
      { id: 'a', title: 'Bacheo calle Morelos', area: OBRAS, status: 'cerrada', createdAt: NOW - 20 * DAY, completedAt: NOW - 10 * DAY },
      { id: 'b', title: 'Bacheo calle Allende', area: OBRAS, status: 'cerrada', createdAt: NOW - 30 * DAY, completedAt: NOW - 16 * DAY },
    ];
    const result = suggestDueDate('Bacheo calle Hidalgo', OBRAS, history);
    expect(result.source).toBe('historico');
    expect(result.basisDays).toBe(12);
    expect(result.reason).toContain('2 tareas parecidas');
  });

  test('sin historial usa la duración habitual del tipo de tarea', () => {
    const result = suggestDueDate('Informe trimestral', OBRAS, []);
    expect(result.source).toBe('estandar');
    expect(result.basisDays).toBe(3);
  });

  test('nunca cae en fin de semana', () => {
    const result = suggestDueDate('Licitación de luminarias', '', []);
    expect([0, 6]).not.toContain(result.suggestedDate.getDay());
  });

  test('si no reconoce nada no sugiere fecha', () => {
    expect(suggestDueDate('Pintar bancas', OBRAS, []).suggestedDate).toBeNull();
  });
});

describe('área sugerida y tareas parecidas', () => {
  const tasks = [
    { id: 'a', title: 'Reporte mensual de obras', area: OBRAS, status: 'pendiente', assignedTo: ['obras@m.com'] },
    { id: 'b', title: 'Reportes mensuales de obra pública', area: OBRAS, status: 'cerrada', assignedTo: ['obras@m.com'] },
    { id: 'c', title: 'Festival de la cultura', area: 'Dirección de Cultura', status: 'pendiente', assignedTo: [] },
  ];

  test('sugiere el área de las tareas parecidas', () => {
    const result = suggestTaskMetadata('Reporte mensual de obras', tasks);
    expect(result.area).toBe(OBRAS);
    expect(result.matches).toBe(2);
  });

  test('detecta una posible duplicada entre las tareas abiertas, sin importar el plural', () => {
    const result = findSimilarTasks('Reportes mensuales de obras', tasks);
    expect(result.map(({ task }) => task.id)).toEqual(['a']);
  });
});
