// Pure, DB-free computation helpers for the Farms/Blocks domain. Kept separate from
// farms.ts so the roll-up/allocation/merge-eligibility math is directly unit-testable
// without a database, the same way commerce.ts exports priceOrder().

export const HARVEST_TYPES = ['early_harvest', 'major_harvest', 'late_harvest', 'off_season_harvest'] as const;
export type HarvestType = (typeof HARVEST_TYPES)[number];

export const HARVEST_PERIOD_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;
export type HarvestPeriodStatus = (typeof HARVEST_PERIOD_STATUSES)[number];

// Deliberately not a DB CHECK enum (see 0006_farm_operations_new_tables.sql) so adding a
// new stage here is a code change, not a migration.
export const ACTIVITY_TYPES = [
  'harvesting',
  'pruning',
  'fertilizer_application',
  'flower_induction',
  'fruiting',
  'pest_control',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_PERIOD_STATUSES = ['planned', 'in_progress', 'completed', 'delayed', 'cancelled'] as const;
export type ActivityPeriodStatus = (typeof ACTIVITY_PERIOD_STATUSES)[number];

export const FARM_STATUSES = ['active', 'inactive', 'archived'] as const;
export const BLOCK_STATUSES = ['active', 'inactive', 'merged', 'archived'] as const;

export interface BlockRow {
  id: string;
  status: string;
  size_acres: number | null;
}

export interface InventoryRow {
  block_id: string;
  crop_variety_id: string;
  variety_name?: string;
  total_trees: number;
  productive_trees: number;
  effective_to: string | null;
}

export interface YieldRow {
  actual_yield_kg: number;
  forecast_yield_kg: number | null;
}

export interface HarvestPeriodRow {
  harvest_type: string;
  status: string;
}

export interface ActivityPeriodRow {
  block_id: string | null;
  activity_type: string;
  status: string;
}

export interface FarmAnalyticsInput {
  farmSizeAcres: number | null;
  blocks: BlockRow[];
  inventories: InventoryRow[];
  yieldRecords: YieldRow[];
  harvestPeriods: HarvestPeriodRow[];
  activityPeriods: ActivityPeriodRow[];
}

export interface FarmAnalytics {
  blockCounts: { active: number; inactive: number; merged: number; archived: number; total: number };
  totalAllocatedSizeAcres: number;
  unallocatedSizeAcres: number | null;
  allocationPercent: number | null;
  totalTrees: number;
  productiveTrees: number;
  varietyTotals: Record<string, number>;
  totalYieldKg: number;
  forecastYieldKg: number;
  yieldPerAcre: number | null;
  yieldPerProductiveTree: number | null;
  harvestTypeDistribution: Record<string, number>;
  activityStageDistribution: Record<string, number>;
  mixedActivityStages: boolean;
  currentActivityStage: string | null;
}

/**
 * Rolls up block-level data into farm-level analytics. Historical yield (yieldRecords) is
 * summed as given -- callers pass in whatever date range they want and must NOT pre-filter
 * by block status, so a merged block's pre-merge yield keeps counting in its historical
 * period. Current-state totals (trees, allocated size) are computed only from active
 * blocks, so merged/archived/inactive blocks never double-count into "current" figures.
 */
export function computeFarmAnalytics(input: FarmAnalyticsInput): FarmAnalytics {
  const { farmSizeAcres, blocks, inventories, yieldRecords, harvestPeriods, activityPeriods } = input;

  const blockCounts = { active: 0, inactive: 0, merged: 0, archived: 0, total: blocks.length };
  const activeBlockIds = new Set<string>();
  for (const block of blocks) {
    if (block.status === 'active') { blockCounts.active += 1; activeBlockIds.add(block.id); }
    else if (block.status === 'inactive') blockCounts.inactive += 1;
    else if (block.status === 'merged') blockCounts.merged += 1;
    else if (block.status === 'archived') blockCounts.archived += 1;
  }

  const totalAllocatedSizeAcres = blocks
    .filter((b) => activeBlockIds.has(b.id))
    .reduce((sum, b) => sum + (b.size_acres || 0), 0);
  const unallocatedSizeAcres = farmSizeAcres != null ? farmSizeAcres - totalAllocatedSizeAcres : null;
  const allocationPercent = farmSizeAcres && farmSizeAcres > 0 ? (totalAllocatedSizeAcres / farmSizeAcres) * 100 : null;

  const currentInventories = inventories.filter((i) => i.effective_to == null && activeBlockIds.has(i.block_id));
  const totalTrees = currentInventories.reduce((sum, i) => sum + i.total_trees, 0);
  const productiveTrees = currentInventories.reduce((sum, i) => sum + i.productive_trees, 0);
  const varietyTotals: Record<string, number> = {};
  for (const inv of currentInventories) {
    const key = inv.variety_name || inv.crop_variety_id;
    varietyTotals[key] = (varietyTotals[key] || 0) + inv.total_trees;
  }

  const totalYieldKg = yieldRecords.reduce((sum, y) => sum + y.actual_yield_kg, 0);
  const forecastYieldKg = yieldRecords.reduce((sum, y) => sum + (y.forecast_yield_kg || 0), 0);
  const yieldPerAcre = totalAllocatedSizeAcres > 0 ? totalYieldKg / totalAllocatedSizeAcres : null;
  const yieldPerProductiveTree = productiveTrees > 0 ? totalYieldKg / productiveTrees : null;

  const harvestTypeDistribution: Record<string, number> = {};
  for (const period of harvestPeriods) {
    harvestTypeDistribution[period.harvest_type] = (harvestTypeDistribution[period.harvest_type] || 0) + 1;
  }

  // "Current stage" per block = its in-progress activity type, if any. A farm shows a
  // single current stage only when every active block that has one shares the same type;
  // otherwise it is reported as mixed, with the full distribution for the block-by-block view.
  const activeStageByBlock = new Map<string, string>();
  for (const period of activityPeriods) {
    if (period.status !== 'in_progress' || !period.block_id || !activeBlockIds.has(period.block_id)) continue;
    activeStageByBlock.set(period.block_id, period.activity_type);
  }
  const activityStageDistribution: Record<string, number> = {};
  for (const blockId of activeBlockIds) {
    const stage = activeStageByBlock.get(blockId) || 'none';
    activityStageDistribution[stage] = (activityStageDistribution[stage] || 0) + 1;
  }
  const distinctStages = Object.keys(activityStageDistribution).filter((stage) => stage !== 'none');
  const mixedActivityStages = distinctStages.length > 1;
  const currentActivityStage = distinctStages.length === 1 ? distinctStages[0] : null;

  return {
    blockCounts,
    totalAllocatedSizeAcres,
    unallocatedSizeAcres,
    allocationPercent,
    totalTrees,
    productiveTrees,
    varietyTotals,
    totalYieldKg,
    forecastYieldKg,
    yieldPerAcre,
    yieldPerProductiveTree,
    harvestTypeDistribution,
    activityStageDistribution,
    mixedActivityStages,
    currentActivityStage,
  };
}

export interface AllocationCheckInput {
  farmSizeAcres: number | null;
  currentlyAllocatedAcres: number;
  incomingSizeAcres: number;
  allowOverride: boolean;
}

export interface AllocationCheckResult {
  allowed: boolean;
  exceeds: boolean;
  projectedAcres: number;
  declaredAcres: number | null;
}

/**
 * Farm-size allocation guard (spec: allocated block area must never silently exceed the
 * farm's declared size without an explicit override). currentlyAllocatedAcres must already
 * exclude the block being created/updated.
 */
export function checkFarmSizeAllocation(input: AllocationCheckInput): AllocationCheckResult {
  const projectedAcres = input.currentlyAllocatedAcres + input.incomingSizeAcres;
  const exceeds = input.farmSizeAcres != null && projectedAcres > input.farmSizeAcres;
  return {
    allowed: !exceeds || input.allowOverride,
    exceeds,
    projectedAcres,
    declaredAcres: input.farmSizeAcres,
  };
}

export interface MergeCandidateBlock {
  id: string;
  farm_id: string;
  status: string;
}

export interface MergeEligibilityResult {
  eligible: boolean;
  reason: string | null;
}

/**
 * Pure eligibility predicate for a block merge -- exercised directly by unit tests, and
 * used by the /blocks/merge route before opening a transaction.
 */
export function isMergeEligible(
  farmId: string,
  sourceBlocks: MergeCandidateBlock[],
  destinationBlock: MergeCandidateBlock | null,
): MergeEligibilityResult {
  if (sourceBlocks.length === 0) return { eligible: false, reason: 'At least one source block is required' };
  if (!destinationBlock) return { eligible: false, reason: 'Destination block not found' };
  if (sourceBlocks.some((b) => b.id === destinationBlock.id)) {
    return { eligible: false, reason: 'Destination block cannot also be a source block' };
  }
  const allBlocks = [...sourceBlocks, destinationBlock];
  if (allBlocks.some((b) => b.farm_id !== farmId)) {
    return { eligible: false, reason: 'All blocks must belong to the same farm' };
  }
  if (sourceBlocks.some((b) => b.status !== 'active')) {
    return { eligible: false, reason: 'All source blocks must be active' };
  }
  if (destinationBlock.status !== 'active') {
    return { eligible: false, reason: 'Destination block must be active' };
  }
  return { eligible: true, reason: null };
}
