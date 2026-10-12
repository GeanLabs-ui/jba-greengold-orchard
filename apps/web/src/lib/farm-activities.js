import activities from '@/data/postHarvestActivities.json';

// The activity catalogue is transcribed from Management Review, rows 5–13.
export { activities };
export const activityStatuses = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', on_hold: 'On Hold', blocked: 'Blocked', deferred: 'Deferred' };
export const dateOnly = (value) => String(value || '').slice(0, 10);
export const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
export const overdueActivity = (task, today = localDate()) => Boolean(task.due_date) && dateOnly(task.due_date) < today && task.status !== 'completed';
export const intersectsRange = (task, start, end) => {
  const from = dateOnly(task.start_date || task.due_date);
  const to = dateOnly(task.due_date || task.start_date);
  return (!start && !end) || (Boolean(from && to) && (!start || to >= start) && (!end || from <= end));
};

// Only unambiguous existing milestone names receive a display default. No records are rewritten on read.
export function activityForTask(task) {
  if (task.activity_id) return activities.find((item) => item.id === task.activity_id);
  const title = task.title || '';
  const exactActivity = activities.find((item) => item.name.toLowerCase() === title.trim().toLowerCase());
  if (exactActivity) return exactActivity;
  const index = /saniti/i.test(title) ? 0 : /prun/i.test(title) ? 1 : /flush|vegetative|recovery growth/i.test(title) ? 2 : /nutrition|soil.*leaf|irrigation/i.test(title) ? 3 : /paklo/i.test(title) ? 4 : /shoot matur/i.test(title) ? 5 : /induction/i.test(title) ? 6 : /bloom|fruit set|crop estimate/i.test(title) ? 7 : /harvest (completed|begins)|harvest readiness/i.test(title) ? 8 : -1;
  return activities[index];
}

export function compareActivitySequence(left, right) {
  const leftSequence = activityForTask(left)?.sequence ?? Infinity;
  const rightSequence = activityForTask(right)?.sequence ?? Infinity;
  if (leftSequence !== rightSequence) return leftSequence - rightSequence;
  return String(left.project_code ?? '').localeCompare(String(right.project_code ?? ''), undefined, { numeric: true });
}

export function synchronizeActivity(task, patch) {
  const next = { ...patch };
  if (Object.hasOwn(patch, 'progress_percent')) {
    const progress = Number(patch.progress_percent);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) throw new Error('Completion must be a whole number from 0 to 100.');
    next.progress_percent = progress;
    if (progress === 100) next.status = 'completed';
    else if ((patch.status || task.status) === 'completed') next.status = progress === 0 ? 'not_started' : 'in_progress';
  }
  if (patch.status === 'completed') { next.status = 'completed'; next.progress_percent = 100; }
  else if (patch.status && patch.status !== 'completed' && Number(task.progress_percent) === 100 && !Object.hasOwn(patch, 'progress_percent')) next.progress_percent = 0;
  const merged = { ...task, ...next };
  if (merged.start_date && merged.due_date && merged.due_date < merged.start_date) throw new Error('End date cannot be before start date.');
  return next;
}

export function filterActivities(tasks, filters, user) {
  return tasks.filter((task) => {
    const activity = activityForTask(task);
    const mine = Boolean(user?.id) && (task.owner_id === user.id || task.owner_user_id === user.id || (!task.owner_id && user.email && task.owner_email === user.email));
    if (filters.tab === 'mine' && !mine) return false;
    if (filters.tab === 'completed' && task.status !== 'completed') return false;
    if (filters.tab === 'overdue' && !overdueActivity(task)) return false;
    if (filters.activity && activity?.id !== filters.activity) return false;
    if (filters.owner && (task.owner_id || task.owner_name) !== filters.owner) return false;
    if (filters.status === 'overdue' ? !overdueActivity(task) : filters.status && task.status !== filters.status) return false;
    const completion = Number(task.progress_percent || 0);
    if (filters.completion === 'partial' && (completion <= 0 || completion >= 100)) return false;
    if (filters.completion != null && filters.completion !== '' && filters.completion !== 'partial' && completion !== Number(filters.completion)) return false;
    if (!intersectsRange(task, filters.start, filters.end)) return false;
    const text = [task.title, task.project_code, task.milestone_code, task.owner_name, task.notes, activity?.name].join(' ').toLowerCase();
    return text.includes((filters.search || '').trim().toLowerCase());
  });
}
