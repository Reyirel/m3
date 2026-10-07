// tests/visibilidadDatosReales.test.js
// ¿Cada tarea la ve solo quien debe? Comprobación con los datos REALES.
//
// Usa las mismas funciones que la app (utils/taskVisibility.js) sobre una copia local
// de `users`, `tasks` y `task_reports`, y la compara con lo que decidirán las reglas del
// servidor (firestore.secure.rules).
//
// La copia local no está en el repositorio (carpeta data/, que git ignora). Sin ella la
// prueba se salta. Para ejecutarla:
//   node scripts/respaldarYRastrearTareas.mjs          (guarda la copia, solo lee)
//   npx jest tests/visibilidadDatosReales
// El informe queda en data/<respaldo>/visibilidad.txt

import fs from 'fs';
import path from 'path';
import { canUserSeeTask, filterVisibleTasks, filterVisibleReports, getUserSecretaria } from '../utils/taskVisibility';
import { getSecretariasForAreas } from '../config/areas';

const snapshot = fs.existsSync('data')
  ? fs.readdirSync('data').filter((name) => name.startsWith('respaldo-') && fs.existsSync(path.join('data', name, 'tasks.json'))).sort().pop()
  : null;
const load = (name) => JSON.parse(fs.readFileSync(path.join('data', snapshot, `${name}.json`), 'utf8'));

const norm = (email) => String(email || '').toLowerCase().trim();
// La sesión como la arma la app (services/authFirestore.js → buildSession)
const sessionOf = (user) => ({
  userId: user.id,
  email: norm(user.email),
  displayName: user.displayName,
  role: user.role,
  department: user.department || '',
  area: user.area || user.department || '',
  direcciones: user.direcciones || [],
  areasPermitidas: user.areasPermitidas || [],
});

(snapshot ? describe : describe.skip)('visibilidad con los datos reales', () => {
  test('cada tarea y cada reporte los ve solo quien debe', () => {
    const users = load('users').filter((u) => u.active !== false);
    const tasks = load('tasks').filter((t) => !t.deleted);
    const reports = load('task_reports').filter((r) => !r.deleted);
    const byEmail = new Map(users.map((u) => [norm(u.email), u]));
    const secretariaOf = (u) => getSecretariasForAreas([u.secretaria || u.area || u.department])[0] || null;
    const lines = [];
    const say = (text = '') => lines.push(text);

    say(`Datos: ${snapshot} — ${users.length} cuentas activas, ${tasks.length} tareas, ${reports.length} reportes`);

    // ── Tareas
    let leaks = 0;
    let missing = 0;
    const extraBySecretario = {};
    const perTask = tasks.map((task) => {
      const assigned = (task.assignedTo || []).map(norm);
      // Secretarías con derecho a ver la tarea: las de sus asignados y las de sus áreas
      const legit = new Set([
        ...assigned.map((email) => byEmail.get(email)).filter(Boolean).map(secretariaOf),
        ...getSecretariasForAreas([task.area, ...(task.areas || [])].filter(Boolean)),
      ].filter(Boolean));
      const viewers = { asignados: [], secretarios: [], indebidos: [], noVen: [] };
      users.forEach((user) => {
        const session = sessionOf(user);
        const sees = canUserSeeTask(task, session);
        const isAssigned = assigned.includes(session.email);
        if (user.role === 'admin') {
          if (!sees) { missing++; viewers.noVen.push(user.email); }
          if (isAssigned) viewers.asignados.push(`${user.email} (administrador)`);
          return;
        }
        if (isAssigned) {
          if (sees) viewers.asignados.push(user.email);
          else { missing++; viewers.noVen.push(user.email); }
        } else if (sees) {
          if (user.role === 'secretario' && legit.has(getUserSecretaria(session))) {
            viewers.secretarios.push(user.email);
            extraBySecretario[user.email] = (extraBySecretario[user.email] || 0) + 1;
          } else {
            leaks++;
            viewers.indebidos.push(`${user.email} (${user.role})`);
          }
        }
      });
      return { task, viewers, sinCuenta: assigned.filter((email) => !byEmail.has(email)) };
    });

    const directors = users.filter((u) => u.role === 'director');
    const directorLeaks = directors.filter((u) => filterVisibleTasks(tasks, sessionOf(u))
      .some((t) => !(t.assignedTo || []).map(norm).includes(norm(u.email))));

    // ── Lo que decidirán las reglas del servidor con estos mismos datos:
    //    ve la tarea si su correo está en assignedTo, o si es secretario y su `area`
    //    (texto exacto) está en `secretarias`
    const ruleDiffs = [];
    tasks.forEach((task) => {
      users.filter((u) => u.role !== 'admin').forEach((user) => {
        const byRule = (task.assignedTo || []).includes(norm(user.email))
          || (user.role === 'secretario' && (task.secretarias || []).includes(user.area));
        const byApp = canUserSeeTask(task, sessionOf(user));
        if (byRule !== byApp) ruleDiffs.push(`${user.email} — "${task.title}": la app dice ${byApp ? 'sí' : 'no'}, las reglas dirán ${byRule ? 'sí' : 'no'}`);
      });
    });

    // ── Reportes: mismo cálculo que las pantallas (filterVisibleReports con las tareas del usuario)
    let reportLeaks = 0;
    const reportLines = reports.map((report) => {
      const task = tasks.find((t) => t.id === report.taskId) || null;
      const seenBy = [];
      users.filter((u) => u.role !== 'admin').forEach((user) => {
        const session = sessionOf(user);
        if (filterVisibleReports([report], filterVisibleTasks(tasks, session), session).length === 0) return;
        const isAuthor = norm(report.createdBy) === session.email;
        const seesTask = task ? canUserSeeTask(task, session) : false;
        if (!isAuthor && !seesTask && user.role !== 'secretario') reportLeaks++;
        seenBy.push(`${user.email} (${isAuthor ? 'autor' : seesTask ? 've la tarea' : 'por el área del reporte'})`);
      });
      return `  "${report.title || 'Reporte'}"${task ? '' : ' [su tarea no existe]'}: ${seenBy.join(', ') || '(solo el administrador)'}`;
    });

    // ── Informe
    say('');
    say('RESULTADO');
    say(`  alguien ve una tarea sin estar asignado ni ser el secretario de un área asignada: ${leaks}`);
    say(`  alguien asignado (o el administrador) NO ve su tarea: ${missing}`);
    say(`  directores que ven alguna tarea que no es suya: ${directorLeaks.length} de ${directors.length}`);
    say(`  la app y las reglas del servidor deciden distinto: ${ruleDiffs.length}`);
    say(`  alguien que no es secretario ve un reporte sin ser su autor ni ver la tarea: ${reportLeaks}`);
    ruleDiffs.forEach((diff) => say(`    ${diff}`));

    say('');
    say('SECRETARIOS QUE VEN TAREAS SIN ESTAR ASIGNADOS (son de una dirección de su secretaría):');
    const extras = Object.entries(extraBySecretario).sort((a, b) => b[1] - a[1]);
    extras.forEach(([email, count]) => say(`  ${String(count).padStart(2)}  ${email}`));
    if (!extras.length) say('  ninguno');

    say('');
    say('TAREA POR TAREA');
    perTask.forEach(({ task, viewers, sinCuenta }) => {
      say(`  "${task.title}"`);
      say(`     asignados: ${viewers.asignados.join(', ') || '(nadie con cuenta activa)'}`);
      if (viewers.secretarios.length) say(`     además la ve, como secretario del área: ${viewers.secretarios.join(', ')}`);
      if (viewers.indebidos.length) say(`     ⚠️ LA VE SIN CORRESPONDERLE: ${viewers.indebidos.join(', ')}`);
      if (viewers.noVen.length) say(`     ⚠️ NO LA VE Y DEBERÍA: ${viewers.noVen.join(', ')}`);
      if (sinCuenta.length) say(`     ⚠️ asignada a una cuenta que no está activa: ${sinCuenta.join(', ')}`);
    });

    say('');
    say('REPORTES');
    reportLines.forEach((line) => say(line));

    fs.writeFileSync(path.join('data', snapshot, 'visibilidad.txt'), lines.join('\n'));

    expect(leaks).toBe(0);
    expect(missing).toBe(0);
    expect(directorLeaks).toHaveLength(0);
    expect(ruleDiffs).toHaveLength(0);
    expect(reportLeaks).toBe(0);
  });
});
