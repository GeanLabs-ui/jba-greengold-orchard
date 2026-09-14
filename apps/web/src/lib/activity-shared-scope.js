export function resolveActivitySharedScope(payload, blocks) {
  if (payload.block_id !== '__shared__') return null;
  const scope = String(payload.shared_scope || '').trim().toUpperCase();
  if (['ALL', 'A&B', 'A & B', 'FARM A & B'].includes(scope)) {
    return { farm_id: '', farm_name: 'Farm A & B', block_id: '', block_name: 'Farm A & B' };
  }
  const codes = [...new Set(scope.split(/[\s,]+/).filter(Boolean))];
  const selected = codes.map((code) => blocks.find((block) =>
    String(block.block_code || block.code || block.name).toUpperCase().replace(/^BLOCK\s+/, '') === code));
  if (!codes.length || selected.some((block) => !block)) {
    throw new Error('Enter configured block codes, such as A1, A2, A3, or Farm A & B.');
  }
  const sameFarm = selected.every((block) => block.farm_id === selected[0].farm_id);
  return {
    farm_id: sameFarm ? selected[0].farm_id : '',
    farm_name: sameFarm ? selected[0].farm_name : 'Farm A & B',
    block_id: selected.length === 1 ? selected[0].id : '',
    block_name: selected.map((block) => block.name).join(', '),
  };
}
