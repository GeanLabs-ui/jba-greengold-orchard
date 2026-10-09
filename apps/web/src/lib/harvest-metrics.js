export function harvestDays(records, date = new Date()) {
  const today = date.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
  const prior = new Date(`${today}T12:00:00Z`);
  prior.setUTCDate(prior.getUTCDate() - 1);
  const yesterday = prior.toISOString().slice(0, 10);
  const recorded = records.filter((r) => !/^(draft|cancelled|canceled|deleted)$/i.test(String(r.status || '').trim()));
  return {
    recorded,
    current: recorded.filter((r) => String(r.harvest_date || '').slice(0, 10) === today),
    previous: recorded.filter((r) => String(r.harvest_date || '').slice(0, 10) === yesterday),
  };
}

export function harvestChange(now, before) {
  return before ? Math.round((now - before) / before * 100) : now ? null : 0;
}
