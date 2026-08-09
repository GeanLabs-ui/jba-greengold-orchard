import type { Database } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';

export type CanonicalFarmEntity = 'Farm' | 'FarmBlock';
export type CanonicalValue = null | string | number | boolean | CanonicalValue[] | { [key: string]: CanonicalValue };
export type CanonicalPayload = Record<string, CanonicalValue>;

const ADMIN_ROLES = new Set<AuthUser['role']>(['super_admin', 'admin']);

export class CanonicalEntityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 404 | 409 | 422,
  ) {
    super(message);
  }
}

export function isCanonicalFarmEntity(name: string): name is CanonicalFarmEntity {
  return name === 'Farm' || name === 'FarmBlock';
}

function isAdmin(user: AuthUser | null): boolean {
  return Boolean(user && ADMIN_ROLES.has(user.role));
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function textValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegative(value: unknown, fallback = 0): number {
  return Math.max(0, numberValue(value, fallback));
}

function positiveOrNull(value: unknown): number | null {
  const parsed = numberValue(value, 0);
  return parsed > 0 ? parsed : null;
}

function nonNegativeOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function booleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (['true', 'yes', '1'].includes(value.toLowerCase())) return true;
    if (['false', 'no', '0'].includes(value.toLowerCase())) return false;
  }
  return fallback;
}

function canonicalStatus(value: unknown, allowed: string[], fallback: string): string {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

function farmRecord(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    farm_code: row.farm_code,
    name: row.name,
    location: row.location,
    region: row.region,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    soil_type: row.soil_type,
    soil_ph: row.soil_ph,
    soil_notes: row.soil_notes,
    size_acres: row.size_acres,
    acres: row.size_acres,
    owner_name: row.owner_name,
    tree_count: row.tree_count ?? 0,
    production_capacity_kg: row.production_capacity_kg ?? 0,
    status: row.status,
    image_url: row.image_url,
    description: row.description,
    notes: row.notes,
    organization_id: row.organization_id,
    operations_started_on: row.operations_started_on,
    planting_started_on: row.planting_started_on,
    created_date: iso(row.created_at),
    updated_date: iso(row.updated_at),
  };
}

function blockRecord(row: Record<string, unknown>): Record<string, unknown> {
  const size = row.size_acres ?? null;
  const inventoryTotal = row.inventory_tree_count == null ? null : numberValue(row.inventory_tree_count);
  return {
    id: row.id,
    farm_id: row.farm_id,
    farm_name: row.farm_name,
    block_code: row.block_code,
    code: row.block_code,
    name: row.name,
    size_acres: size,
    acres: size,
    area_acres: size,
    latitude: row.latitude,
    longitude: row.longitude,
    soil_type: row.soil_type,
    soil_ph: row.soil_ph,
    soil_notes: row.soil_notes,
    description: row.description,
    early_block_classification: row.early_block_classification,
    year_planted: row.year_planted,
    variety: row.variety || row.inventory_varieties || null,
    tree_count: inventoryTotal ?? row.tree_count ?? 0,
    status: row.status,
    organization_id: row.organization_id,
    programme_code: row.programme_code,
    source: row.source,
    early_harvest: Boolean(row.early_harvest),
    shoot_maturity: row.shoot_maturity ?? 0,
    forecast_yield_kg: row.forecast_yield_kg,
    fruit_fly_pressure: row.fruit_fly_pressure,
    disease_rating: row.disease_rating,
    operations_started_on: row.operations_started_on,
    planting_started_on: row.planting_started_on,
    merged_into_block_id: row.merged_into_block_id,
    merge_effective_date: row.merge_effective_date,
    created_date: iso(row.created_at),
    updated_date: iso(row.updated_at),
  };
}

const blockSelect = `
  SELECT fb.*, f.name AS farm_name,
    inventory.tree_count AS inventory_tree_count,
    inventory.varieties AS inventory_varieties
  FROM farm_blocks fb
  JOIN farms f ON f.id = fb.farm_id
  LEFT JOIN LATERAL (
    SELECT sum(bci.total_trees)::int AS tree_count,
      string_agg(cv.name, ', ' ORDER BY cv.name) AS varieties
    FROM block_crop_inventories bci
    JOIN crop_varieties cv ON cv.id = bci.crop_variety_id
    WHERE bci.block_id = fb.id AND bci.effective_to IS NULL
  ) inventory ON true
`;

export async function listCanonicalFarmEntity(
  sql: Database,
  name: CanonicalFarmEntity,
  user: AuthUser | null,
  limit: number,
  offset: number,
): Promise<Record<string, unknown>[]> {
  if (name === 'Farm') {
    const rows = isAdmin(user)
      ? await sql`SELECT * FROM farms ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      : await sql`SELECT * FROM farms WHERE status = 'active' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    return rows.map((row) => farmRecord(row));
  }

  if (!user) return [];
  const rows = isAdmin(user)
    ? await sql.unsafe(`${blockSelect} ORDER BY fb.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset])
    : await sql.unsafe(`${blockSelect} WHERE f.organization_id IS NOT DISTINCT FROM $1 ORDER BY fb.created_at DESC LIMIT $2 OFFSET $3`, [user.organizationId, limit, offset]);
  return rows.map((row) => blockRecord(row));
}

function farmCodeBase(name: string): string {
  const normalized = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42);
  return normalized || `FARM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function uniqueFarmCode(sql: Database, requested: string): Promise<string> {
  const base = farmCodeBase(requested);
  const existing = await sql`SELECT id FROM farms WHERE farm_code = ${base}`;
  return existing[0] ? `${base.slice(0, 37)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}` : base;
}

async function resolveOrCreateFarm(sql: Database, user: AuthUser, payload: CanonicalPayload) {
  const farmName = textValue(payload.farm_name);
  const farmId = textValue(payload.farm_id);
  if (farmName) {
    const named = isAdmin(user)
      ? await sql`SELECT * FROM farms WHERE lower(name) = lower(${farmName}) ORDER BY created_at LIMIT 1`
      : await sql`SELECT * FROM farms WHERE lower(name) = lower(${farmName}) AND organization_id IS NOT DISTINCT FROM ${user.organizationId} ORDER BY created_at LIMIT 1`;
    if (named[0]) return named[0];
  }
  if (farmId) {
    const identified = isAdmin(user)
      ? await sql`SELECT * FROM farms WHERE id = ${farmId}`
      : await sql`SELECT * FROM farms WHERE id = ${farmId} AND organization_id IS NOT DISTINCT FROM ${user.organizationId}`;
    if (identified[0]) return identified[0];
  }
  if (!farmName) throw new CanonicalEntityError('FARM_REQUIRED', 'A valid farm_id or farm_name is required', 422);

  const id = crypto.randomUUID();
  const code = await uniqueFarmCode(sql, textValue(payload.farm_code) || farmName);
  const rows = await sql`
    INSERT INTO farms (id, farm_code, name, status, organization_id, created_by, updated_by)
    VALUES (${id}, ${code}, ${farmName}, 'active', ${user.organizationId}, ${user.id}, ${user.id})
    RETURNING *
  `;
  return rows[0];
}

async function ensureInventory(sql: Database, block: Record<string, unknown>, varietyName: string, user: AuthUser): Promise<void> {
  const organizationId = typeof block.organization_id === 'string' ? block.organization_id : null;
  const blockId = String(block.id);
  let varieties = await sql`
    SELECT id FROM crop_varieties
    WHERE lower(name) = lower(${varietyName}) AND organization_id IS NOT DISTINCT FROM ${organizationId}
    ORDER BY created_at LIMIT 1
  `;
  if (!varieties[0]) {
    varieties = await sql`
      INSERT INTO crop_varieties (id, organization_id, name)
      VALUES (${crypto.randomUUID()}, ${organizationId}, ${varietyName})
      RETURNING id
    `;
  }
  const current = await sql`SELECT id FROM block_crop_inventories WHERE block_id = ${blockId} AND effective_to IS NULL LIMIT 1`;
  if (!current[0]) {
    const treeCount = Math.max(0, Math.trunc(numberValue(block.tree_count, 0)));
    await sql`
      INSERT INTO block_crop_inventories (
        id, block_id, crop_variety_id, total_trees, productive_trees,
        non_productive_trees, dead_trees, effective_from, created_by, updated_by
      ) VALUES (
        ${crypto.randomUUID()}, ${blockId}, ${String(varieties[0].id)}, ${treeCount}, ${treeCount}, 0, 0,
        CURRENT_DATE, ${user.id}, ${user.id}
      )
    `;
  }
}

export async function createCanonicalFarmEntity(
  sql: Database,
  name: CanonicalFarmEntity,
  user: AuthUser,
  payload: CanonicalPayload,
  ipAddress: string,
): Promise<Record<string, unknown>> {
  if (name === 'Farm') {
    const farmName = textValue(payload.name);
    if (!farmName) throw new CanonicalEntityError('VALIDATION_ERROR', 'Farm name is required', 422);
    const code = await uniqueFarmCode(sql, textValue(payload.farm_code) || farmName);
    const id = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO farms (
        id, farm_code, name, location, region, country, latitude, longitude, soil_type, soil_ph, soil_notes, size_acres,
        owner_name, tree_count, production_capacity_kg, status, image_url, description, notes,
        organization_id, operations_started_on, planting_started_on, created_by, updated_by
      ) VALUES (
        ${id}, ${code}, ${farmName}, ${textValue(payload.location)}, ${textValue(payload.region)},
        ${textValue(payload.country) || 'Ghana'}, ${payload.latitude == null ? null : numberValue(payload.latitude)},
        ${payload.longitude == null ? null : numberValue(payload.longitude)}, ${textValue(payload.soil_type)},
        ${payload.soil_ph == null ? null : numberValue(payload.soil_ph)}, ${textValue(payload.soil_notes)},
        ${positiveOrNull(payload.size_acres ?? payload.acres)},
        ${textValue(payload.owner_name)}, ${Math.trunc(nonNegative(payload.tree_count))},
        ${Math.trunc(nonNegative(payload.production_capacity_kg))},
        ${canonicalStatus(payload.status, ['active', 'inactive', 'archived'], 'active')},
        ${textValue(payload.image_url)}, ${textValue(payload.description)}, ${textValue(payload.notes)},
        ${user.organizationId}, ${textValue(payload.operations_started_on)}, ${textValue(payload.planting_started_on)},
        ${user.id}, ${user.id}
      ) RETURNING *
    `;
    await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, 'create', 'farms', ${id}, ${sql.json(payload)}, ${ipAddress})`;
    return farmRecord(rows[0]);
  }

  const blockCode = textValue(payload.block_code ?? payload.code);
  if (!blockCode) throw new CanonicalEntityError('VALIDATION_ERROR', 'Block code is required', 422);
  const farm = await resolveOrCreateFarm(sql, user, payload);
  const duplicate = await sql`SELECT id FROM farm_blocks WHERE farm_id = ${farm.id} AND lower(block_code) = lower(${blockCode})`;
  if (duplicate[0]) throw new CanonicalEntityError('DUPLICATE_CODE', 'A block with this code already exists on this farm', 409);

  const id = crypto.randomUUID();
  const variety = textValue(payload.variety);
  const rows = await sql`
    INSERT INTO farm_blocks (
      id, farm_id, block_code, name, description, early_block_classification, year_planted,
      size_acres, latitude, longitude, soil_type, soil_ph, soil_notes,
      variety, tree_count, status, organization_id,
      programme_code, source, early_harvest, shoot_maturity, forecast_yield_kg,
      fruit_fly_pressure, disease_rating, operations_started_on, planting_started_on, created_by, updated_by
    ) VALUES (
      ${id}, ${farm.id}, ${blockCode}, ${textValue(payload.name) || blockCode},
      ${textValue(payload.description)}, ${textValue(payload.early_block_classification)},
      ${payload.year_planted == null ? null : Math.trunc(numberValue(payload.year_planted))},
      ${positiveOrNull(payload.size_acres ?? payload.acres ?? payload.area_acres)},
      ${payload.latitude == null ? null : numberValue(payload.latitude)}, ${payload.longitude == null ? null : numberValue(payload.longitude)},
      ${textValue(payload.soil_type)}, ${payload.soil_ph == null ? null : numberValue(payload.soil_ph)}, ${textValue(payload.soil_notes)}, ${variety},
      ${Math.trunc(nonNegative(payload.tree_count))},
      ${canonicalStatus(payload.status, ['active', 'inactive'], 'active')}, ${farm.organization_id ?? user.organizationId},
      ${textValue(payload.programme_code)}, ${textValue(payload.source)},
      ${textValue(payload.early_block_classification) === 'Yes' || booleanValue(payload.early_harvest)},
      ${nonNegative(payload.shoot_maturity)}, ${nonNegativeOrNull(payload.forecast_yield_kg)},
      ${textValue(payload.fruit_fly_pressure)}, ${textValue(payload.disease_rating)},
      ${textValue(payload.operations_started_on)}, ${textValue(payload.planting_started_on)}, ${user.id}, ${user.id}
    ) RETURNING *
  `;
  const block = rows[0];
  if (variety) await ensureInventory(sql, block, variety, user);
  await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, 'create', 'farm_blocks', ${id}, ${sql.json(payload)}, ${ipAddress})`;
  return blockRecord({ ...block, farm_name: farm.name, inventory_tree_count: block.tree_count, inventory_varieties: variety });
}

async function loadFarmForWrite(sql: Database, id: string, user: AuthUser) {
  const rows = isAdmin(user)
    ? await sql`SELECT * FROM farms WHERE id = ${id}`
    : await sql`SELECT * FROM farms WHERE id = ${id} AND organization_id IS NOT DISTINCT FROM ${user.organizationId}`;
  return rows[0] || null;
}

async function loadBlockForWrite(sql: Database, id: string, user: AuthUser) {
  const rows = isAdmin(user)
    ? await sql`SELECT fb.*, f.name AS farm_name FROM farm_blocks fb JOIN farms f ON f.id = fb.farm_id WHERE fb.id = ${id}`
    : await sql`SELECT fb.*, f.name AS farm_name FROM farm_blocks fb JOIN farms f ON f.id = fb.farm_id WHERE fb.id = ${id} AND f.organization_id IS NOT DISTINCT FROM ${user.organizationId}`;
  return rows[0] || null;
}

function nextText(payload: CanonicalPayload, key: string, existing: unknown): string | null {
  return key in payload ? textValue(payload[key]) : textValue(existing);
}

function nextNumber(payload: CanonicalPayload, key: string, existing: unknown): number {
  return key in payload ? nonNegative(payload[key], numberValue(existing)) : numberValue(existing);
}

export async function updateCanonicalFarmEntity(
  sql: Database,
  name: CanonicalFarmEntity,
  id: string,
  user: AuthUser,
  payload: CanonicalPayload,
  ipAddress: string,
): Promise<Record<string, unknown>> {
  if (name === 'Farm') {
    const existing = await loadFarmForWrite(sql, id, user);
    if (!existing) throw new CanonicalEntityError('NOT_FOUND', 'Farm not found', 404);
    const nextCode = nextText(payload, 'farm_code', existing.farm_code) || existing.farm_code;
    if (nextCode !== existing.farm_code) {
      const duplicate = await sql`SELECT id FROM farms WHERE farm_code = ${nextCode} AND id != ${id}`;
      if (duplicate[0]) throw new CanonicalEntityError('DUPLICATE_CODE', 'Farm code is already in use', 409);
    }
    const rows = await sql`
      UPDATE farms SET
        farm_code = ${nextCode}, name = ${nextText(payload, 'name', existing.name) || existing.name},
        location = ${nextText(payload, 'location', existing.location)}, region = ${nextText(payload, 'region', existing.region)},
        country = ${nextText(payload, 'country', existing.country) || 'Ghana'},
        latitude = ${'latitude' in payload ? (payload.latitude == null ? null : numberValue(payload.latitude)) : existing.latitude},
        longitude = ${'longitude' in payload ? (payload.longitude == null ? null : numberValue(payload.longitude)) : existing.longitude},
        soil_type = ${nextText(payload, 'soil_type', existing.soil_type)},
        soil_ph = ${'soil_ph' in payload ? (payload.soil_ph == null ? null : numberValue(payload.soil_ph)) : existing.soil_ph},
        soil_notes = ${nextText(payload, 'soil_notes', existing.soil_notes)},
        size_acres = ${('size_acres' in payload || 'acres' in payload) ? positiveOrNull(payload.size_acres ?? payload.acres) : existing.size_acres},
        owner_name = ${nextText(payload, 'owner_name', existing.owner_name)},
        tree_count = ${Math.trunc(nextNumber(payload, 'tree_count', existing.tree_count))},
        production_capacity_kg = ${Math.trunc(nextNumber(payload, 'production_capacity_kg', existing.production_capacity_kg))},
        status = ${canonicalStatus(payload.status, ['active', 'inactive', 'archived'], existing.status)},
        image_url = ${nextText(payload, 'image_url', existing.image_url)}, description = ${nextText(payload, 'description', existing.description)},
        notes = ${nextText(payload, 'notes', existing.notes)}, operations_started_on = ${nextText(payload, 'operations_started_on', existing.operations_started_on)},
        planting_started_on = ${nextText(payload, 'planting_started_on', existing.planting_started_on)},
        updated_by = ${user.id}, updated_at = now()
      WHERE id = ${id} RETURNING *
    `;
    await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, new_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'farms', ${id}, ${sql.json(existing)}, ${sql.json(payload)}, ${ipAddress})`;
    return farmRecord(rows[0]);
  }

  const existing = await loadBlockForWrite(sql, id, user);
  if (!existing) throw new CanonicalEntityError('NOT_FOUND', 'Block not found', 404);
  if (existing.status === 'merged') throw new CanonicalEntityError('BLOCK_MERGED', 'A merged block cannot be edited', 422);
  const nextCode = nextText(payload, 'block_code', existing.block_code) || nextText(payload, 'code', existing.block_code) || existing.block_code;
  if (nextCode !== existing.block_code) {
    const duplicate = await sql`SELECT id FROM farm_blocks WHERE farm_id = ${existing.farm_id} AND lower(block_code) = lower(${nextCode}) AND id != ${id}`;
    if (duplicate[0]) throw new CanonicalEntityError('DUPLICATE_CODE', 'A block with this code already exists on this farm', 409);
  }
  const sizeChanged = 'size_acres' in payload || 'acres' in payload || 'area_acres' in payload;
  const rows = await sql`
    UPDATE farm_blocks SET
      block_code = ${nextCode}, name = ${nextText(payload, 'name', existing.name) || existing.name},
      description = ${nextText(payload, 'description', existing.description)},
      early_block_classification = ${nextText(payload, 'early_block_classification', existing.early_block_classification)},
      year_planted = ${'year_planted' in payload ? (payload.year_planted == null ? null : Math.trunc(numberValue(payload.year_planted))) : existing.year_planted},
      size_acres = ${sizeChanged ? positiveOrNull(payload.size_acres ?? payload.acres ?? payload.area_acres) : existing.size_acres},
      latitude = ${'latitude' in payload ? (payload.latitude == null ? null : numberValue(payload.latitude)) : existing.latitude},
      longitude = ${'longitude' in payload ? (payload.longitude == null ? null : numberValue(payload.longitude)) : existing.longitude},
      soil_type = ${nextText(payload, 'soil_type', existing.soil_type)},
      soil_ph = ${'soil_ph' in payload ? (payload.soil_ph == null ? null : numberValue(payload.soil_ph)) : existing.soil_ph},
      soil_notes = ${nextText(payload, 'soil_notes', existing.soil_notes)},
      variety = ${nextText(payload, 'variety', existing.variety)},
      tree_count = ${Math.trunc(nextNumber(payload, 'tree_count', existing.tree_count))},
      status = ${canonicalStatus(payload.status, ['active', 'inactive', 'archived'], existing.status)},
      programme_code = ${nextText(payload, 'programme_code', existing.programme_code)}, source = ${nextText(payload, 'source', existing.source)},
      early_harvest = ${'early_block_classification' in payload
        ? textValue(payload.early_block_classification) === 'Yes'
        : ('early_harvest' in payload ? booleanValue(payload.early_harvest, existing.early_harvest) : existing.early_harvest)},
      shoot_maturity = ${nextNumber(payload, 'shoot_maturity', existing.shoot_maturity)},
      forecast_yield_kg = ${'forecast_yield_kg' in payload ? nonNegativeOrNull(payload.forecast_yield_kg) : existing.forecast_yield_kg},
      fruit_fly_pressure = ${nextText(payload, 'fruit_fly_pressure', existing.fruit_fly_pressure)},
      disease_rating = ${nextText(payload, 'disease_rating', existing.disease_rating)},
      operations_started_on = ${nextText(payload, 'operations_started_on', existing.operations_started_on)},
      planting_started_on = ${nextText(payload, 'planting_started_on', existing.planting_started_on)},
      updated_by = ${user.id}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  const variety = textValue(rows[0].variety);
  if (variety) await ensureInventory(sql, rows[0], variety, user);
  await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, new_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'farm_blocks', ${id}, ${sql.json(existing)}, ${sql.json(payload)}, ${ipAddress})`;
  return blockRecord({ ...rows[0], farm_name: existing.farm_name });
}

export async function archiveCanonicalFarmEntity(
  sql: Database,
  name: CanonicalFarmEntity,
  id: string,
  user: AuthUser,
  ipAddress: string,
): Promise<void> {
  const existing = name === 'Farm' ? await loadFarmForWrite(sql, id, user) : await loadBlockForWrite(sql, id, user);
  if (!existing) throw new CanonicalEntityError('NOT_FOUND', `${name === 'Farm' ? 'Farm' : 'Block'} not found`, 404);
  const table = name === 'Farm' ? 'farms' : 'farm_blocks';
  if (name === 'Farm') {
    await sql`UPDATE farms SET status = 'archived', updated_by = ${user.id}, updated_at = now() WHERE id = ${id}`;
    await sql`INSERT INTO farm_status_history (id, farm_id, action, previous_status, new_status, reason, effective_date, performed_by) VALUES (${crypto.randomUUID()}, ${id}, 'archived', ${existing.status}, 'archived', 'Archived through compatibility API', CURRENT_DATE, ${user.id})`;
  } else {
    await sql`UPDATE farm_blocks SET status = 'archived', updated_by = ${user.id}, updated_at = now() WHERE id = ${id}`;
    await sql`INSERT INTO block_status_history (id, block_id, action, previous_status, new_status, reason, effective_date, performed_by) VALUES (${crypto.randomUUID()}, ${id}, 'archived', ${existing.status}, 'archived', 'Archived through compatibility API', CURRENT_DATE, ${user.id})`;
  }
  await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, 'archive', ${table}, ${id}, ${sql.json(existing)}, ${ipAddress})`;
}
