// Reference-image fixtures, loaded only by Vite's development build.
export function harvestPreviewData() {
  const farms = [{ id: 'demo-a', name: 'Farm A' }, { id: 'demo-b', name: 'Farm B' }];
  const entries = [
    ['0048', '2025-04-24', '10:24', 'A1', 'demo-a', 'Kent', 1250, 50, 3500, 'Team Alpha', 'Kwarme Mensah', 'Completed'],
    ['0047', '2025-04-24', '09:15', 'A2', 'demo-a', 'Kent', 850, 30, 2300, 'Team Bravo', 'Abena Darko', 'In Progress'],
    ['0046', '2025-04-23', '08:40', 'B1', 'demo-b', 'Kent', 980, 80, 2800, 'Team Charlie', 'Samuel Ahinn', 'Awaiting Transport'],
    ['0045', '2025-04-23', '07:30', 'B3', 'demo-b', 'Keitt', 620, 20, 1900, 'Team Delta', 'Efia Serwaa', 'Quality Check'],
  ];
  return {
    farms,
    blocks: ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'].map((code) => ({ id: `demo-${code}`, name: code, farm_id: code.startsWith('A') ? 'demo-a' : 'demo-b' })),
    records: entries.map(([code, date, time, block, farm, variety, qty, rejected, cost, team, supervisor, status]) => ({ id: `demo-${code}`, harvest_code: `HV-2025-${code}`, harvest_date: date, created_date: `${date}T${time}:00Z`, farm_id: farm, farm_name: farms.find((f) => f.id === farm).name, block_id: `demo-${block}`, block_name: block, mango_variety: variety, quantity_harvested_kg: qty, rejected_kg: rejected, harvest_cost: cost, team_name: team, supervisor_name: supervisor, status })),
  };
}
