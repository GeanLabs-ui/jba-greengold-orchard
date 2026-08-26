const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asText = (value) => String(value || '').trim();

export const normalizeStatus = (value) => asText(value).toLowerCase();

export function parseRecordDate(value) {
  if (!value) return null;
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function activityYieldKg(activity) {
  const recordedHarvest = asNumber(activity.harvest_quantity);
  if (recordedHarvest > 0) return recordedHarvest;
  const gradedHarvest = asNumber(activity.grade_a_quantity)
    + asNumber(activity.grade_b_quantity)
    + asNumber(activity.rejected_quantity);
  if (gradedHarvest > 0) return gradedHarvest;
  return normalizeStatus(activity.category) === 'harvesting'
    ? asNumber(activity.output_quantity_kg ?? activity.quantity_used)
    : 0;
}

export function activityRevenue(activity) {
  return asNumber(activity.revenue ?? activity.actual_revenue ?? activity.total_revenue);
}

export function activityCost(activity) {
  const actualCost = activity.actual_cost;
  return actualCost === null || actualCost === undefined || (typeof actualCost === 'string' && actualCost.trim() === '')
    ? asNumber(activity.cost)
    : asNumber(actualCost);
}

export function activityMatchesBlock(activity, block) {
  const hasSameValue = (left, right) => {
    const leftValue = asText(left).toLowerCase();
    const rightValue = asText(right).toLowerCase();
    return Boolean(leftValue && rightValue && leftValue === rightValue);
  };
  const blockLabels = [block.name, block.block_name, block.block_code];
  return hasSameValue(activity.block_id, block.id)
    || blockLabels.some((label) => hasSameValue(activity.block_name, label))
    || blockLabels.some((label) => hasSameValue(activity.block_code, label));
}

const isActiveStructure = (record) => !['inactive', 'archived', 'merged'].includes(normalizeStatus(record.status));

export function buildFarmOperationsAnalytics(
  { farms = [], blocks = [], dailyActivities = [] },
  { start = null, end = null, farmId = 'all', blockId = 'all' } = {},
) {
  const farmNameById = new Map(farms.map((farm) => [String(farm.id), farm.name]));
  const farmNameByLabel = new Map(farms.map((farm) => [asText(farm.name).toLowerCase(), farm.name]));
  const blockById = new Map(blocks.map((block) => [String(block.id), block]));
  const blockByLabel = new Map();
  blocks.forEach((block) => {
    [block.name, block.block_name, block.block_code].filter(Boolean).forEach((label) => {
      blockByLabel.set(asText(label).toLowerCase(), block);
    });
  });
  const selectedFarmName = farmNameById.get(String(farmId));
  const blockFor = (row) => blockById.get(String(row.block_id))
    || blockByLabel.get(asText(row.block_name || row.block_code).toLowerCase());
  const farmFor = (row) => {
    const block = blockFor(row);
    return farmNameByLabel.get(asText(row.farm_name).toLowerCase())
      || farmNameById.get(String(row.farm_id))
      || asText(block?.farm_name)
      || farmNameById.get(String(block?.farm_id))
      || 'Unassigned farm';
  };
  const matchesFarm = (row) => farmId === 'all'
    || String(row.farm_id) === String(farmId)
    || farmFor(row) === selectedFarmName;
  const matchesBlock = (row) => blockId === 'all'
    || String(row.block_id) === String(blockId)
    || String(blockFor(row)?.id) === String(blockId);
  const matchesPeriod = (row) => {
    if (!start && !end) return true;
    const date = parseRecordDate(row.activity_date || row.created_date);
    if (!date) return false;
    return (!start || date >= start) && (!end || date <= end);
  };

  const selectedBlock = blockById.get(String(blockId));
  const visibleFarms = farms.filter((farm) => isActiveStructure(farm)
    && (farmId === 'all' || String(farm.id) === String(farmId))
    && (blockId === 'all' || String(farm.id) === String(selectedBlock?.farm_id)));
  const visibleBlocks = blocks.filter((block) => isActiveStructure(block) && matchesFarm(block)
    && (blockId === 'all' || String(block.id) === String(blockId)));
  const activities = dailyActivities.filter((activity) => matchesFarm(activity) && matchesBlock(activity) && matchesPeriod(activity));
  const costRows = activities
    .map((activity) => ({
      ...activity,
      value: activityCost(activity),
      costCategory: activity.cost_type || activity.category || 'Other',
    }))
    .filter((activity) => activity.value > 0);

  return {
    activities,
    costRows,
    farmFor,
    farmNameById,
    visibleFarms,
    visibleBlocks,
    totalTrees: visibleBlocks.reduce((sum, block) => sum + asNumber(block.tree_count ?? block.total_trees), 0),
    totalProjectedCost: activities.reduce((sum, activity) => sum + asNumber(activity.projected_cost), 0),
    totalCost: costRows.reduce((sum, activity) => sum + activity.value, 0),
    totalYieldKg: activities.reduce((sum, activity) => sum + activityYieldKg(activity), 0),
    totalRevenue: activities.reduce((sum, activity) => sum + activityRevenue(activity), 0),
    activeTasks: activities.filter((activity) => !['completed', 'approved', 'cancelled'].includes(normalizeStatus(activity.status))).length,
  };
}
