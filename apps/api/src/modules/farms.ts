import type { Context } from "hono";
import { Hono } from "hono";
import type postgres from "postgres";
import { z } from "zod";
import { hasPermission } from "mango-farm-authorization";
import { closeDatabase, createDatabase, type Database } from "../db.js";
import {
  requireAuth,
  requireCsrf,
  requirePermission,
  type AppVariables,
  type AuthUser,
} from "../middleware/auth.js";
import { requestIp } from "../rate-limit.js";
import {
  checkFarmSizeAllocation,
  computeFarmAnalytics,
  HARVEST_PERIOD_STATUSES,
  HARVEST_TYPES,
  isMergeEligible,
  type ActivityPeriodRow,
  type HarvestPeriodRow,
  type InventoryRow,
  type MergeCandidateBlock,
  type YieldRow,
} from "./farm-analytics.js";

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

// This module owns the canonical relational Farm/FarmBlock model. The compatibility routes
// in entities.ts preserve the previous base44.entities.Farm/FarmBlock browser contract, but
// they read and write these same tables; entity_records is not an active farm data source.

const ADMIN_ROLES = new Set<AuthUser["role"]>(["super_admin", "admin"]);
function isAdmin(user: AuthUser): boolean {
  return ADMIN_ROLES.has(user.role);
}

function errorResponse(
  c: AppContext,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
) {
  return c.json(
    { error: { code, message }, requestId: c.get("requestId") },
    status,
  );
}

async function parseBody(c: AppContext): Promise<unknown> {
  return c.req.json().catch(() => null);
}

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
router.use("*", requireAuth());

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

// Profile forms load nullable database columns directly. Accepting null here is
// intentional: it lets a user save an unchanged, optional field that has not
// yet been recorded instead of rejecting the entire update.
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const farmImagePreviewUrl = z.string()
  .trim()
  .regex(/^\/api\/v1\/files\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\?preview=1$/i, "Expected a managed farm image preview URL")
  .nullable()
  .optional();

const farmCreateSchema = z.object({
  farm_code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200),
  location: optionalText(300),
  region: optionalText(120),
  country: optionalText(120),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  soil_type: optionalText(120),
  soil_ph: z.number().min(0).max(14).nullable().optional(),
  soil_notes: optionalText(2000),
  size_acres: z.number().positive().nullable().optional(),
  owner_name: optionalText(200),
  operations_started_on: dateString.nullable().optional(),
  planting_started_on: dateString.nullable().optional(),
  description: optionalText(2000),
  notes: optionalText(2000),
  image_url: farmImagePreviewUrl,
});
const farmUpdateSchema = farmCreateSchema.partial();

const deactivateSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  effective_date: dateString,
  notes: z.string().trim().max(1000).optional(),
});

const inventoryEntryFields = z.object({
  crop_variety_id: z.string().trim().min(1).optional(),
  variety_name: z.string().trim().min(1).max(120).optional(),
  total_trees: z.number().int().min(0),
  productive_trees: z.number().int().min(0),
  non_productive_trees: z.number().int().min(0).optional().default(0),
  dead_trees: z.number().int().min(0).optional().default(0),
  planting_date: dateString.nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});
const inventoryEntrySchema = inventoryEntryFields
  .refine((v) => v.crop_variety_id || v.variety_name, {
    message: "crop_variety_id or variety_name is required",
  })
  .refine(
    (v) =>
      v.productive_trees + v.non_productive_trees + v.dead_trees <=
      v.total_trees,
    {
      message:
        "productive + non-productive + dead trees cannot exceed total trees",
    },
  );

const blockCreateSchema = z.object({
  block_code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  early_block_classification: z
    .enum(["Yes", "Mid", "New"])
    .nullable()
    .optional(),
  year_planted: z.number().int().min(1900).max(2200).nullable().optional(),
  size_acres: z.number().positive().nullable().optional(),
  shoot_maturity: z.number().min(0).max(1).optional(),
  forecast_yield_kg: z.number().min(0).nullable().optional(),
  actual_yield_kg: z.number().min(0).nullable().optional(),
  mango_variety: z.string().trim().max(120).nullable().optional(),
  fruit_fly_pressure: z.string().trim().max(120).nullable().optional(),
  disease_rating: z.string().trim().max(120).nullable().optional(),
  disease_severity: z.enum(["Low", "Medium", "High"]).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  soil_type: optionalText(120),
  soil_ph: z.number().min(0).max(14).nullable().optional(),
  soil_notes: optionalText(2000),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  operations_started_on: dateString.nullable().optional(),
  planting_started_on: dateString.nullable().optional(),
  allow_size_override: z.boolean().optional().default(false),
  inventory: z.array(inventoryEntrySchema).optional().default([]),
});
const blockUpdateSchema = blockCreateSchema
  .omit({ inventory: true })
  .partial()
  .extend({
    farm_id: z.string().trim().min(1).optional(),
    allow_size_override: z.boolean().optional().default(false),
  });

const activityPeriodFields = z.object({
  activity_type: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[a-z0-9][a-z0-9_-]*$/i,
      "Use letters, numbers, hyphens, or underscores for the activity type",
    ),
  status: z
    .enum(["planned", "in_progress", "completed", "delayed", "cancelled"])
    .optional()
    .default("planned"),
  season_year: z.number().int().min(2000).max(2200).nullable().optional(),
  planned_start_date: dateString.nullable().optional(),
  planned_end_date: dateString.nullable().optional(),
  actual_start_date: dateString.nullable().optional(),
  actual_end_date: dateString.nullable().optional(),
  completion_percent: z.number().int().min(0).max(100).optional().default(0),
  notes: z.string().trim().max(2000).optional(),
});
const activityPeriodUpdateSchema = activityPeriodFields.partial();

const harvestPeriodFields = z.object({
  farm_id: z.string().trim().min(1),
  block_id: z.string().trim().min(1).nullable().optional(),
  crop_variety_id: z.string().trim().min(1).nullable().optional(),
  harvest_type: z.enum(HARVEST_TYPES),
  status: z.enum(HARVEST_PERIOD_STATUSES).optional().default("planned"),
  season_year: z.number().int().min(2000).max(2200).nullable().optional(),
  expected_start_date: dateString.nullable().optional(),
  expected_end_date: dateString.nullable().optional(),
  actual_start_date: dateString.nullable().optional(),
  actual_end_date: dateString.nullable().optional(),
  expected_yield_kg: z.number().min(0).optional().default(0),
  actual_yield_kg: z.number().min(0).optional().default(0),
  notes: z.string().trim().max(2000).optional(),
});
const harvestPeriodUpdateSchema = harvestPeriodFields
  .partial()
  .omit({ farm_id: true });

function activityDatesAreValid(values: Record<string, unknown>) {
  const dateValue = (value: unknown) =>
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : typeof value === "string"
        ? value.slice(0, 10)
        : null;
  const plannedStart = dateValue(values.planned_start_date);
  const plannedEnd = dateValue(values.planned_end_date);
  const actualStart = dateValue(values.actual_start_date);
  const actualEnd = dateValue(values.actual_end_date);
  return (
    (!plannedStart || !plannedEnd || plannedEnd >= plannedStart) &&
    (!actualStart || !actualEnd || actualEnd >= actualStart)
  );
}

function harvestDatesAreValid(values: Record<string, unknown>) {
  const value = (entry: unknown) =>
    entry instanceof Date
      ? entry.toISOString().slice(0, 10)
      : typeof entry === "string"
        ? entry.slice(0, 10)
        : null;
  const expectedStart = value(values.expected_start_date);
  const expectedEnd = value(values.expected_end_date);
  const actualStart = value(values.actual_start_date);
  const actualEnd = value(values.actual_end_date);
  return (
    (!expectedStart || !expectedEnd || expectedEnd >= expectedStart) &&
    (!actualStart || !actualEnd || actualEnd >= actualStart)
  );
}

const mergeSchema = z.object({
  farm_id: z.string().trim().min(1),
  source_block_ids: z.array(z.string().trim().min(1)).min(1).max(20),
  destination_block_id: z.string().trim().min(1),
  effective_date: dateString,
  reason: z.string().trim().min(1).max(500),
  idempotency_key: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Farms
// ---------------------------------------------------------------------------

router.get(
  "/harvest-periods",
  requirePermission("harvest_periods.read"),
  async (c) => {
    const user = c.get("user")!;
    const farmId = c.req.query("farm_id") || null;
    const blockId = c.req.query("block_id") || null;
    const harvestType = c.req.query("harvest_type") || null;
    const status = c.req.query("status") || null;
    const seasonYearValue = c.req.query("season_year");
    const seasonYear = seasonYearValue ? Number(seasonYearValue) : null;
    if (seasonYearValue && !Number.isInteger(seasonYear))
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        "Season year must be a whole number",
        422,
      );
    const sql = createDatabase(c.env);
    try {
      const rows = await sql`
      SELECT hp.id, hp.farm_id, f.name AS farm_name, f.farm_code,
        hp.block_id, fb.name AS block_name, fb.block_code, fb.status AS block_status,
        hp.crop_variety_id, cv.name AS variety_name, hp.harvest_type, hp.status, hp.season_year,
        hp.expected_start_date::text AS expected_start_date, hp.expected_end_date::text AS expected_end_date,
        hp.actual_start_date::text AS actual_start_date, hp.actual_end_date::text AS actual_end_date,
        hp.expected_yield_kg, hp.actual_yield_kg, hp.notes, hp.created_at, hp.updated_at
      FROM harvest_periods hp
      JOIN farms f ON f.id = hp.farm_id
      LEFT JOIN farm_blocks fb ON fb.id = hp.block_id
      LEFT JOIN crop_varieties cv ON cv.id = hp.crop_variety_id
      WHERE (${isAdmin(user)} OR f.organization_id IS NOT DISTINCT FROM ${user.organizationId})
        AND (${farmId}::text IS NULL OR hp.farm_id = ${farmId})
        AND (${blockId}::text IS NULL OR hp.block_id = ${blockId})
        AND (${harvestType}::text IS NULL OR hp.harvest_type = ${harvestType})
        AND (${status}::text IS NULL OR hp.status = ${status})
        AND (${seasonYear}::int IS NULL OR hp.season_year = ${seasonYear})
      ORDER BY hp.expected_start_date ASC NULLS LAST, f.name, fb.block_code NULLS FIRST
      LIMIT 1000
    `;
      return c.json({ data: rows, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.post(
  "/harvest-periods",
  requirePermission("harvest_periods.create"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = harvestPeriodFields.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid harvest period",
        422,
      );
    if (!harvestDatesAreValid(parsed.data))
      return errorResponse(
        c,
        "INVALID_DATE_RANGE",
        "Harvest end dates cannot be before their start dates",
        422,
      );
    const sql = createDatabase(c.env);
    try {
      const farm = await loadFarm(sql, parsed.data.farm_id, user);
      if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);
      if (parsed.data.block_id) {
        const block = await loadBlock(sql, parsed.data.block_id, user);
        if (!block || block.farm_id !== farm.id)
          return errorResponse(
            c,
            "INVALID_BLOCK",
            "The selected block does not belong to this farm",
            422,
          );
        if (block.status !== "active")
          return errorResponse(
            c,
            "BLOCK_INACTIVE",
            "Harvest schedules can only be assigned to active blocks",
            422,
          );
      }
      const id = crypto.randomUUID();
      const [created] = await sql`
      INSERT INTO harvest_periods (
        id, organization_id, farm_id, block_id, crop_variety_id, harvest_type, status, season_year,
        expected_start_date, expected_end_date, actual_start_date, actual_end_date,
        expected_yield_kg, actual_yield_kg, notes, created_by, updated_by
      ) VALUES (
        ${id}, ${farm.organization_id}, ${farm.id}, ${parsed.data.block_id || null}, ${parsed.data.crop_variety_id || null},
        ${parsed.data.harvest_type}, ${parsed.data.status}, ${parsed.data.season_year || null},
        ${parsed.data.expected_start_date || null}, ${parsed.data.expected_end_date || null},
        ${parsed.data.actual_start_date || null}, ${parsed.data.actual_end_date || null},
        ${parsed.data.expected_yield_kg || 0}, ${parsed.data.actual_yield_kg || 0}, ${parsed.data.notes || ""}, ${user.id}, ${user.id}
      )
      RETURNING id, farm_id, block_id, crop_variety_id, harvest_type, status, season_year,
        expected_start_date::text AS expected_start_date, expected_end_date::text AS expected_end_date,
        actual_start_date::text AS actual_start_date, actual_end_date::text AS actual_end_date,
        expected_yield_kg, actual_yield_kg, notes, created_at, updated_at
    `;
      return c.json({ data: created, requestId: c.get("requestId") }, 201);
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.patch(
  "/harvest-periods/:id",
  requirePermission("harvest_periods.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = harvestPeriodUpdateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid harvest period update",
        422,
      );
    const sql = createDatabase(c.env);
    try {
      const rows = await sql`
      SELECT hp.* FROM harvest_periods hp JOIN farms f ON f.id = hp.farm_id
      WHERE hp.id = ${c.req.param("id")} AND (${isAdmin(user)} OR f.organization_id IS NOT DISTINCT FROM ${user.organizationId})
      LIMIT 1
    `;
      const existing = rows[0];
      if (!existing)
        return errorResponse(c, "NOT_FOUND", "Harvest period not found", 404);
      const merged = { ...existing, ...parsed.data };
      if (!harvestDatesAreValid(merged))
        return errorResponse(
          c,
          "INVALID_DATE_RANGE",
          "Harvest end dates cannot be before their start dates",
          422,
        );
      if (parsed.data.block_id) {
        const block = await loadBlock(sql, parsed.data.block_id, user);
        if (!block || block.farm_id !== existing.farm_id)
          return errorResponse(
            c,
            "INVALID_BLOCK",
            "The selected block does not belong to this farm",
            422,
          );
      }
      const blockId = (merged.block_id || null) as string | null;
      const cropVarietyId = (merged.crop_variety_id || null) as string | null;
      const harvestType = String(merged.harvest_type);
      const periodStatus = String(merged.status);
      const seasonYear = merged.season_year ? Number(merged.season_year) : null;
      const expectedStartDate = (merged.expected_start_date || null) as
        | string
        | null;
      const expectedEndDate = (merged.expected_end_date || null) as
        | string
        | null;
      const actualStartDate = (merged.actual_start_date || null) as
        | string
        | null;
      const actualEndDate = (merged.actual_end_date || null) as string | null;
      const notes = String(merged.notes || "");
      const [updated] = await sql`
      UPDATE harvest_periods SET
        block_id = ${blockId}, crop_variety_id = ${cropVarietyId},
        harvest_type = ${harvestType}, status = ${periodStatus}, season_year = ${seasonYear},
        expected_start_date = ${expectedStartDate}, expected_end_date = ${expectedEndDate},
        actual_start_date = ${actualStartDate}, actual_end_date = ${actualEndDate},
        expected_yield_kg = ${Number(merged.expected_yield_kg || 0)}, actual_yield_kg = ${Number(merged.actual_yield_kg || 0)},
        notes = ${notes}, updated_by = ${user.id}, updated_at = now()
      WHERE id = ${existing.id}
      RETURNING id, farm_id, block_id, crop_variety_id, harvest_type, status, season_year,
        expected_start_date::text AS expected_start_date, expected_end_date::text AS expected_end_date,
        actual_start_date::text AS actual_start_date, actual_end_date::text AS actual_end_date,
        expected_yield_kg, actual_yield_kg, notes, created_at, updated_at
    `;
      return c.json({ data: updated, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.get("/farms", requirePermission("farms.read"), async (c) => {
  const user = c.get("user")!;
  const limit = Math.min(250, Math.max(1, Number(c.req.query("limit")) || 50));
  const offset = Math.max(0, Number(c.req.query("offset")) || 0);
  const status = c.req.query("status") || null;
  const region = c.req.query("region") || null;
  const variety = c.req.query("variety") || null;
  const qRaw = c.req.query("q");
  const q = qRaw ? `%${qRaw}%` : null;

  const sql = createDatabase(c.env);
  try {
    const rows = await sql`
      WITH matched_farms AS (
        SELECT * FROM farms
        WHERE (${isAdmin(user)} OR organization_id IS NOT DISTINCT FROM ${user.organizationId})
          AND (${status}::text IS NULL OR status = ${status})
          AND (${region}::text IS NULL OR region = ${region})
          AND (${q}::text IS NULL OR name ILIKE ${q} OR farm_code ILIKE ${q} OR location ILIKE ${q})
          AND (
            ${variety}::text IS NULL OR EXISTS (
              SELECT 1 FROM block_crop_inventories bci
              JOIN farm_blocks fb ON fb.id = bci.block_id
              JOIN crop_varieties cv ON cv.id = bci.crop_variety_id
              WHERE fb.farm_id = farms.id AND bci.effective_to IS NULL AND cv.name = ${variety}
            )
          )
        ORDER BY name
        LIMIT ${limit} OFFSET ${offset}
      )
      SELECT
        mf.*,
        mf.operations_started_on::text AS operations_started_on,
        mf.planting_started_on::text AS planting_started_on,
        COALESCE(bc.block_count, 0)::int AS block_count,
        COALESCE(bc.active_block_count, 0)::int AS active_block_count,
        COALESCE(bc.allocated_size_acres, 0) AS allocated_size_acres,
        COALESCE(bc.block_varieties, ARRAY[]::text[]) AS block_varieties,
        COALESCE(bc.block_locations, ARRAY[]::text[]) AS block_locations,
        CASE WHEN COALESCE(tc.inventory_record_count, 0) > 0 THEN tc.total_trees::int ELSE NULL END AS total_trees,
        COALESCE(tc.inventory_record_count, 0)::int AS inventory_record_count,
        COALESCE(tc.variety_totals, '{}'::jsonb) AS variety_totals,
        COALESCE(hc.harvest_types, ARRAY[]::text[]) AS harvest_types,
        hc.next_harvest
      FROM matched_farms mf
      LEFT JOIN LATERAL (
        SELECT
          count(*) AS block_count,
          count(*) FILTER (WHERE status = 'active') AS active_block_count,
          COALESCE(sum(size_acres) FILTER (WHERE status = 'active'), 0) AS allocated_size_acres,
          COALESCE(
            array_agg(DISTINCT fb.variety) FILTER (WHERE NULLIF(btrim(fb.variety), '') IS NOT NULL),
            ARRAY[]::text[]
          ) AS block_varieties,
          COALESCE(
            array_agg(DISTINCT NULLIF(btrim(to_jsonb(fb)->>'location'), ''))
              FILTER (WHERE NULLIF(btrim(to_jsonb(fb)->>'location'), '') IS NOT NULL),
            ARRAY[]::text[]
          ) AS block_locations
        FROM farm_blocks fb WHERE fb.farm_id = mf.id
      ) bc ON true
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(sum(variety_sum.sum), 0) AS total_trees,
          COALESCE(sum(variety_sum.record_count), 0) AS inventory_record_count,
          jsonb_object_agg(cv.name, variety_sum.sum) FILTER (WHERE cv.name IS NOT NULL) AS variety_totals
        FROM (
          SELECT bci.crop_variety_id, sum(bci.total_trees) AS sum, count(*) AS record_count
          FROM block_crop_inventories bci
          JOIN farm_blocks fb2 ON fb2.id = bci.block_id AND fb2.status = 'active'
          WHERE fb2.farm_id = mf.id AND bci.effective_to IS NULL
          GROUP BY bci.crop_variety_id
        ) variety_sum
        JOIN crop_varieties cv ON cv.id = variety_sum.crop_variety_id
      ) tc ON true
      LEFT JOIN LATERAL (
        SELECT
          array_agg(DISTINCT hp.harvest_type) FILTER (WHERE hp.harvest_type IS NOT NULL) AS harvest_types,
          (
            SELECT jsonb_build_object(
              'harvest_type', hp2.harvest_type,
              'status', hp2.status,
              'expected_start_date', hp2.expected_start_date::text,
              'expected_end_date', hp2.expected_end_date::text
            )
            FROM harvest_periods hp2
            WHERE hp2.farm_id = mf.id AND hp2.status IN ('active', 'planned')
            ORDER BY CASE WHEN hp2.status = 'active' THEN 0 ELSE 1 END,
              hp2.expected_start_date ASC NULLS LAST
            LIMIT 1
          ) AS next_harvest
        FROM harvest_periods hp WHERE hp.farm_id = mf.id
      ) hc ON true
      ORDER BY mf.name
    `;
    return c.json({
      data: rows,
      pagination: { limit, offset, hasMore: rows.length === limit },
      requestId: c.get("requestId"),
    });
  } finally {
    await closeDatabase(sql);
  }
});

router.post(
  "/farms",
  requirePermission("farms.create"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = farmCreateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid farm details",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const id = crypto.randomUUID();
      const farmCode =
        parsed.data.farm_code || `FARM-${id.slice(0, 8).toUpperCase()}`;
      const existing =
        await sql`SELECT id FROM farms WHERE farm_code = ${farmCode}`;
      if (existing[0])
        return errorResponse(
          c,
          "DUPLICATE_CODE",
          "A farm with this code already exists",
          409,
        );

      const rows = await sql`
      INSERT INTO farms (
        id, farm_code, name, location, region, country, latitude, longitude, soil_type, soil_ph, soil_notes, size_acres,
        owner_name, operations_started_on, planting_started_on, description, notes, image_url,
        status, organization_id, created_by, updated_by
      ) VALUES (
        ${id}, ${farmCode ?? null}, ${parsed.data.name ?? null}, ${parsed.data.location ?? null}, ${parsed.data.region ?? null},
        ${parsed.data.country ?? "Ghana"}, ${parsed.data.latitude ?? null}, ${parsed.data.longitude ?? null},
        ${parsed.data.soil_type ?? null}, ${parsed.data.soil_ph ?? null}, ${parsed.data.soil_notes ?? null},
        ${parsed.data.size_acres ?? null}, ${parsed.data.owner_name ?? null},
        ${parsed.data.operations_started_on ?? null}, ${parsed.data.planting_started_on ?? null},
        ${parsed.data.description ?? null}, ${parsed.data.notes ?? null}, ${parsed.data.image_url ?? null},
        'active', ${user.organizationId}, ${user.id}, ${user.id}
      )
      RETURNING *, operations_started_on::text AS operations_started_on, planting_started_on::text AS planting_started_on
    `;
      await sql`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${user.id}, 'create', 'farms', ${id}, ${sql.json(rows[0])}, ${requestIp(c.req.raw)})
    `;
      return c.json({ data: rows[0], requestId: c.get("requestId") }, 201);
    } finally {
      await closeDatabase(sql);
    }
  },
);

async function loadFarm(sql: Database, id: string, user: AuthUser) {
  const rows = await sql`
    SELECT *, operations_started_on::text AS operations_started_on, planting_started_on::text AS planting_started_on
    FROM farms
    WHERE id = ${id} AND (${isAdmin(user)} OR organization_id IS NOT DISTINCT FROM ${user.organizationId})
  `;
  return rows[0] || null;
}

router.get("/farms/:id", requirePermission("farms.read"), async (c) => {
  const user = c.get("user")!;
  const sql = createDatabase(c.env);
  try {
    const farm = await loadFarm(sql, c.req.param("id"), user);
    if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);

    const blocks = await sql`
      SELECT id, farm_id, block_code, name, description, early_block_classification, year_planted,
        size_acres, latitude, longitude, soil_type, soil_ph, soil_notes,
        variety, tree_count, status, programme_code, source, early_harvest, shoot_maturity,
        forecast_yield_kg, fruit_fly_pressure, disease_rating,
        merged_into_block_id, merge_effective_date,
        operations_started_on::text AS operations_started_on,
        planting_started_on::text AS planting_started_on,
        created_at, updated_at
      FROM farm_blocks WHERE farm_id = ${farm.id} ORDER BY block_code
    `;
    const blockIds = blocks.map((b) => b.id);
    const inventories = blockIds.length
      ? await sql`
      SELECT bci.block_id, bci.crop_variety_id, cv.name AS variety_name, bci.total_trees,
        bci.productive_trees, bci.non_productive_trees, bci.dead_trees, bci.effective_to
      FROM block_crop_inventories bci
      JOIN crop_varieties cv ON cv.id = bci.crop_variety_id
      WHERE bci.block_id = ANY(${blockIds}) AND bci.effective_to IS NULL
    `
      : [];

    const start =
      c.req.query("start") || `${new Date().getUTCFullYear()}-01-01`;
    const end = c.req.query("end") || new Date().toISOString().slice(0, 10);
    const yieldRecords = await sql`
      SELECT yr.block_id, fb.block_code, fb.name AS block_name, yr.record_date::text AS record_date,
        yr.actual_yield_kg, yr.forecast_yield_kg, yr.harvest_type,
        cv.name AS variety_name
      FROM yield_records yr
      JOIN farm_blocks fb ON fb.id = yr.block_id
      LEFT JOIN crop_varieties cv ON cv.id = yr.crop_variety_id
      WHERE yr.farm_id = ${farm.id} AND yr.record_date BETWEEN ${start} AND ${end}
      ORDER BY yr.record_date
    `;
    const harvestPeriods = await sql`
      SELECT block_id, harvest_type, status, expected_start_date::text AS expected_start_date,
        expected_end_date::text AS expected_end_date, actual_start_date::text AS actual_start_date,
        actual_end_date::text AS actual_end_date, expected_yield_kg, actual_yield_kg
      FROM harvest_periods WHERE farm_id = ${farm.id}
      ORDER BY expected_start_date DESC NULLS LAST
    `;
    const activityPeriods = await sql`
      SELECT block_id, activity_type, status, planned_start_date::text AS planned_start_date,
        planned_end_date::text AS planned_end_date, completion_percent
      FROM farm_activity_periods WHERE farm_id = ${farm.id}
      ORDER BY planned_start_date DESC NULLS LAST
    `;

    const analytics = computeFarmAnalytics({
      farmSizeAcres: farm.size_acres,
      blocks: blocks.map((b) => ({
        id: b.id,
        status: b.status,
        size_acres: b.size_acres,
      })),
      inventories: inventories as unknown as InventoryRow[],
      yieldRecords: yieldRecords as unknown as YieldRow[],
      harvestPeriods: harvestPeriods as unknown as HarvestPeriodRow[],
      activityPeriods: activityPeriods as unknown as ActivityPeriodRow[],
    });

    const blockSummaries = blocks.map((block) => {
      const blockInventories = inventories.filter(
        (inventory) => inventory.block_id === block.id,
      );
      const blockActivities = activityPeriods.filter(
        (period) => period.block_id === block.id,
      );
      const blockHarvests = harvestPeriods.filter(
        (period) => period.block_id === block.id,
      );
      const blockYields = yieldRecords.filter(
        (record) => record.block_id === block.id,
      );
      const currentActivity =
        blockActivities.find((period) => period.status === "in_progress") ||
        null;
      const currentHarvest =
        blockHarvests.find((period) => period.status === "active") || null;
      return {
        ...block,
        inventory: blockInventories,
        total_trees: blockInventories.reduce(
          (sum, inventory) => sum + inventory.total_trees,
          0,
        ),
        productive_trees: blockInventories.reduce(
          (sum, inventory) => sum + inventory.productive_trees,
          0,
        ),
        varieties: blockInventories.map((inventory) => inventory.variety_name),
        current_activity: currentActivity,
        current_harvest: currentHarvest,
        harvest_periods: blockHarvests,
        period_yield_kg: blockYields.reduce(
          (sum, record) => sum + record.actual_yield_kg,
          0,
        ),
        inventory_record_count: blockInventories.length,
        yield_record_count: blockYields.length,
        period_forecast_yield_kg: blockYields.reduce(
          (sum, record) => sum + (record.forecast_yield_kg || 0),
          0,
        ),
      };
    });

    return c.json({
      data: {
        ...farm,
        blocks: blockSummaries,
        analytics: {
          ...analytics,
          inventoryRecordCount: inventories.length,
          yieldRecordCount: yieldRecords.length,
        },
        yield_records: yieldRecords,
        harvest_periods: harvestPeriods,
        activity_periods: activityPeriods,
        analytics_period: { start, end },
      },
      requestId: c.get("requestId"),
    });
  } finally {
    await closeDatabase(sql);
  }
});

router.patch(
  "/farms/:id",
  requirePermission("farms.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = farmUpdateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid farm details",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const existing = await loadFarm(sql, c.req.param("id"), user);
      if (!existing)
        return errorResponse(c, "NOT_FOUND", "Farm not found", 404);
      if (
        parsed.data.farm_code &&
        parsed.data.farm_code !== existing.farm_code
      ) {
        const dupe =
          await sql`SELECT id FROM farms WHERE farm_code = ${parsed.data.farm_code} AND id != ${existing.id}`;
        if (dupe[0])
          return errorResponse(
            c,
            "DUPLICATE_CODE",
            "A farm with this code already exists",
            409,
          );
      }
      const merged = { ...existing, ...parsed.data };
      const rows = await sql`
      UPDATE farms SET
        farm_code = ${merged.farm_code ?? null}, name = ${merged.name ?? null}, location = ${merged.location ?? null},
        region = ${merged.region ?? null}, country = ${merged.country ?? "Ghana"},
        latitude = ${merged.latitude ?? null}, longitude = ${merged.longitude ?? null},
        soil_type = ${merged.soil_type ?? null}, soil_ph = ${merged.soil_ph ?? null}, soil_notes = ${merged.soil_notes ?? null},
        size_acres = ${merged.size_acres ?? null}, owner_name = ${merged.owner_name ?? null},
        operations_started_on = ${merged.operations_started_on ?? null},
        planting_started_on = ${merged.planting_started_on ?? null},
        description = ${merged.description ?? null}, notes = ${merged.notes ?? null},
        image_url = ${merged.image_url ?? null}, updated_by = ${user.id}, updated_at = now()
      WHERE id = ${existing.id}
      RETURNING *, operations_started_on::text AS operations_started_on, planting_started_on::text AS planting_started_on
    `;
      await sql`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'farms', ${existing.id}, ${sql.json(existing)}, ${sql.json(rows[0])}, ${requestIp(c.req.raw)})
    `;
      return c.json({ data: rows[0], requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.post(
  "/farms/:id/deactivate",
  requirePermission("farms.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = deactivateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ||
          "A reason and effective date are required",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const farm = await loadFarm(sql, c.req.param("id"), user);
      if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);
      if (farm.status !== "active")
        return errorResponse(
          c,
          "INVALID_STATUS",
          "Only an active farm can be deactivated",
          422,
        );

      await sql.begin(async (transaction) => {
        await transaction`UPDATE farms SET status = 'inactive', updated_by = ${user.id}, updated_at = now() WHERE id = ${farm.id}`;
        await transaction`
        INSERT INTO farm_status_history (id, farm_id, action, previous_status, new_status, reason, effective_date, performed_by)
        VALUES (${crypto.randomUUID()}, ${farm.id}, 'deactivated', ${farm.status}, 'inactive', ${parsed.data.reason}, ${parsed.data.effective_date}, ${user.id})
      `;
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'deactivate', 'farms', ${farm.id}, ${sql.json(parsed.data)}, ${requestIp(c.req.raw)})
      `;
      });
      return c.json({
        data: { id: farm.id, status: "inactive" },
        requestId: c.get("requestId"),
      });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.post(
  "/farms/:id/reactivate",
  requirePermission("farms.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const sql = createDatabase(c.env);
    try {
      const farm = await loadFarm(sql, c.req.param("id"), user);
      if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);
      if (farm.status === "active")
        return errorResponse(
          c,
          "INVALID_STATUS",
          "Farm is already active",
          422,
        );

      await sql.begin(async (transaction) => {
        await transaction`UPDATE farms SET status = 'active', updated_by = ${user.id}, updated_at = now() WHERE id = ${farm.id}`;
        await transaction`
        INSERT INTO farm_status_history (id, farm_id, action, previous_status, new_status, performed_by)
        VALUES (${crypto.randomUUID()}, ${farm.id}, 'reactivated', ${farm.status}, 'active', ${user.id})
      `;
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'reactivate', 'farms', ${farm.id}, ${requestIp(c.req.raw)})
      `;
      });
      return c.json({
        data: { id: farm.id, status: "active" },
        requestId: c.get("requestId"),
      });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.get("/farms/:id/history", requirePermission("farms.read"), async (c) => {
  const user = c.get("user")!;
  const sql = createDatabase(c.env);
  try {
    const farm = await loadFarm(sql, c.req.param("id"), user);
    if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);
    const history = await sql`
      SELECT id, action, previous_status, new_status, reason, effective_date::text AS effective_date, performed_by, created_at
      FROM farm_status_history WHERE farm_id = ${farm.id} ORDER BY created_at DESC
    `;
    return c.json({ data: history, requestId: c.get("requestId") });
  } finally {
    await closeDatabase(sql);
  }
});

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

async function loadBlock(sql: Database, id: string, user: AuthUser) {
  const rows = await sql`
    SELECT fb.*, fb.variety AS mango_variety, fb.operations_started_on::text AS operations_started_on, fb.planting_started_on::text AS planting_started_on,
      fb.merge_effective_date::text AS merge_effective_date
    FROM farm_blocks fb
    JOIN farms f ON f.id = fb.farm_id
    WHERE fb.id = ${id} AND (${isAdmin(user)} OR f.organization_id IS NOT DISTINCT FROM ${user.organizationId})
  `;
  return rows[0] || null;
}

router.get(
  "/farms/:farmId/blocks",
  requirePermission("blocks.read"),
  async (c) => {
    const user = c.get("user")!;
    const status = c.req.query("status") || null;
    const sql = createDatabase(c.env);
    try {
      const farm = await loadFarm(sql, c.req.param("farmId"), user);
      if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);
      const rows = await sql`
      SELECT fb.*, fb.variety AS mango_variety, fb.operations_started_on::text AS operations_started_on, fb.planting_started_on::text AS planting_started_on
      FROM farm_blocks fb
      WHERE fb.farm_id = ${farm.id} AND (${status}::text IS NULL OR fb.status = ${status})
      ORDER BY fb.block_code
    `;
      return c.json({ data: rows, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.post(
  "/farms/:farmId/blocks",
  requirePermission("blocks.create"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = blockCreateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid block details",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const farm = await loadFarm(sql, c.req.param("farmId"), user);
      if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);

      const dupe =
        await sql`SELECT id FROM farm_blocks WHERE farm_id = ${farm.id} AND block_code = ${parsed.data.block_code}`;
      if (dupe[0])
        return errorResponse(
          c,
          "DUPLICATE_CODE",
          "A block with this code already exists on this farm",
          409,
        );

      if (parsed.data.size_acres != null) {
        const allocated =
          await sql`SELECT COALESCE(sum(size_acres), 0) AS total FROM farm_blocks WHERE farm_id = ${farm.id} AND status = 'active'`;
        const allocation = checkFarmSizeAllocation({
          farmSizeAcres: farm.size_acres,
          currentlyAllocatedAcres: Number(allocated[0].total),
          incomingSizeAcres: parsed.data.size_acres,
          allowOverride:
            parsed.data.allow_size_override &&
            (isAdmin(user) || hasPermission(user.role, "farms.update")),
        });
        if (!allocation.allowed) {
          return errorResponse(
            c,
            "ALLOCATION_EXCEEDS_DECLARED_SIZE",
            `Allocating ${parsed.data.size_acres} acres would bring the farm to ${allocation.projectedAcres} acres, exceeding its declared size of ${allocation.declaredAcres} acres`,
            422,
          );
        }
      }

      const blockId = crypto.randomUUID();
      const block = await sql.begin(async (transaction) => {
        const [inserted] = await transaction`
        INSERT INTO farm_blocks (
          id, farm_id, block_code, name, description, early_block_classification, year_planted,
          size_acres, latitude, longitude, soil_type, soil_ph, soil_notes,
          early_harvest, shoot_maturity, forecast_yield_kg, actual_yield_kg, variety, fruit_fly_pressure, disease_rating, disease_severity,
          status, operations_started_on, planting_started_on,
          organization_id, created_by, updated_by
        ) VALUES (
          ${blockId}, ${farm.id}, ${parsed.data.block_code}, ${parsed.data.name},
          ${parsed.data.description ?? null}, ${parsed.data.early_block_classification ?? null}, ${parsed.data.year_planted ?? null},
          ${parsed.data.size_acres ?? null},
          ${parsed.data.latitude ?? null}, ${parsed.data.longitude ?? null}, ${parsed.data.soil_type ?? null},
          ${parsed.data.soil_ph ?? null}, ${parsed.data.soil_notes ?? null},
          ${parsed.data.early_block_classification === "Yes"}, ${parsed.data.shoot_maturity ?? 0},
          ${parsed.data.forecast_yield_kg ?? null}, ${parsed.data.actual_yield_kg ?? null}, ${parsed.data.mango_variety ?? null}, ${parsed.data.fruit_fly_pressure ?? null}, ${parsed.data.disease_rating ?? null}, ${parsed.data.disease_severity ?? null},
          ${parsed.data.status}, ${parsed.data.operations_started_on || null}, ${parsed.data.planting_started_on || null},
          ${farm.organization_id}, ${user.id}, ${user.id}
        )
        RETURNING *, variety AS mango_variety, operations_started_on::text AS operations_started_on, planting_started_on::text AS planting_started_on
      `;
        for (const entry of parsed.data.inventory) {
          const cropVarietyId = await resolveVarietyId(
            transaction,
            farm.organization_id,
            entry.crop_variety_id,
            entry.variety_name,
          );
          await transaction`
          INSERT INTO block_crop_inventories (
            id, block_id, crop_variety_id, total_trees, productive_trees, non_productive_trees, dead_trees,
            planting_date, notes, created_by, updated_by
          ) VALUES (
            ${crypto.randomUUID()}, ${blockId}, ${cropVarietyId}, ${entry.total_trees}, ${entry.productive_trees},
            ${entry.non_productive_trees}, ${entry.dead_trees}, ${entry.planting_date || null}, ${entry.notes ?? null}, ${user.id}, ${user.id}
          )
        `;
        }
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'create', 'farm_blocks', ${blockId}, ${sql.json(inserted)}, ${requestIp(c.req.raw)})
      `;
        return inserted;
      });
      return c.json({ data: block, requestId: c.get("requestId") }, 201);
    } finally {
      await closeDatabase(sql);
    }
  },
);

type Queryable = Database | postgres.TransactionSql;

async function resolveVarietyId(
  transaction: Queryable,
  organizationId: string | null,
  cropVarietyId?: string,
  varietyName?: string,
): Promise<string> {
  if (cropVarietyId) return cropVarietyId;
  if (!varietyName) throw new Error("A crop variety is required");
  const existing = await transaction`
    SELECT id FROM crop_varieties WHERE name = ${varietyName} AND organization_id IS NOT DISTINCT FROM ${organizationId}
  `;
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await transaction`INSERT INTO crop_varieties (id, organization_id, name) VALUES (${id}, ${organizationId}, ${varietyName})`;
  return id;
}

router.get("/blocks/:id", requirePermission("blocks.read"), async (c) => {
  const user = c.get("user")!;
  const sql = createDatabase(c.env);
  try {
    const block = await loadBlock(sql, c.req.param("id"), user);
    if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);

    const inventory = await sql`
      SELECT bci.id, bci.crop_variety_id, cv.name AS variety_name, bci.total_trees, bci.productive_trees,
        bci.non_productive_trees, bci.dead_trees, bci.planting_date::text AS planting_date, bci.notes,
        bci.effective_from::text AS effective_from, bci.effective_to::text AS effective_to
      FROM block_crop_inventories bci
      JOIN crop_varieties cv ON cv.id = bci.crop_variety_id
      WHERE bci.block_id = ${block.id}
      ORDER BY bci.effective_from DESC
    `;
    const start =
      c.req.query("start") || `${new Date().getUTCFullYear()}-01-01`;
    const end = c.req.query("end") || new Date().toISOString().slice(0, 10);
    const yieldRecords = await sql`
      SELECT record_date::text AS record_date, actual_yield_kg, forecast_yield_kg, harvest_type
      FROM yield_records WHERE block_id = ${block.id} AND record_date BETWEEN ${start} AND ${end}
      ORDER BY record_date
    `;
    const harvestPeriods = await sql`
      SELECT id, harvest_type, status, expected_start_date::text AS expected_start_date,
        expected_end_date::text AS expected_end_date, actual_start_date::text AS actual_start_date,
        actual_end_date::text AS actual_end_date, expected_yield_kg, actual_yield_kg
      FROM harvest_periods WHERE block_id = ${block.id} ORDER BY expected_start_date DESC NULLS LAST
    `;
    const activityPeriods = await sql`
      SELECT id, activity_type, status, planned_start_date::text AS planned_start_date,
        planned_end_date::text AS planned_end_date, actual_start_date::text AS actual_start_date,
        actual_end_date::text AS actual_end_date, completion_percent, season_year, notes
      FROM farm_activity_periods WHERE block_id = ${block.id} ORDER BY planned_start_date DESC NULLS LAST
    `;
    const mergeInfo =
      block.status === "merged"
        ? (
            await sql`
          SELECT bm.id AS merge_id, bm.destination_block_id, bm.effective_date::text AS effective_date, bm.reason
          FROM block_merge_sources bms JOIN block_merges bm ON bm.id = bms.block_merge_id
          WHERE bms.source_block_id = ${block.id} ORDER BY bm.created_at DESC LIMIT 1
        `
          )[0] || null
        : null;

    const currentInventories = inventory.filter((i) => !i.effective_to);
    const totalTrees = currentInventories.reduce(
      (sum, i) => sum + i.total_trees,
      0,
    );
    const productiveTrees = currentInventories.reduce(
      (sum, i) => sum + i.productive_trees,
      0,
    );
    const totalYieldKg = yieldRecords.reduce(
      (sum, y) => sum + y.actual_yield_kg,
      0,
    );

    return c.json({
      data: {
        ...block,
        inventory,
        yield_records: yieldRecords,
        harvest_periods: harvestPeriods,
        activity_periods: activityPeriods,
        merge_info: mergeInfo,
        analytics: {
          inventory_record_count: currentInventories.length,
          yield_record_count: yieldRecords.length,
          total_trees: totalTrees,
          productive_trees: productiveTrees,
          total_yield_kg: totalYieldKg,
          yield_per_acre:
            block.size_acres > 0 ? totalYieldKg / block.size_acres : null,
          yield_per_productive_tree:
            productiveTrees > 0 ? totalYieldKg / productiveTrees : null,
        },
        analytics_period: { start, end },
      },
      requestId: c.get("requestId"),
    });
  } finally {
    await closeDatabase(sql);
  }
});

router.patch(
  "/blocks/:id",
  requirePermission("blocks.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = blockUpdateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid block details",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const existing = await loadBlock(sql, c.req.param("id"), user);
      if (!existing)
        return errorResponse(c, "NOT_FOUND", "Block not found", 404);
      if (existing.status === "merged")
        return errorResponse(
          c,
          "BLOCK_MERGED",
          "A merged block cannot be edited directly; edit the destination block instead",
          422,
        );

      const targetFarm = parsed.data.farm_id && parsed.data.farm_id !== existing.farm_id
        ? await loadFarm(sql, parsed.data.farm_id, user)
        : null;
      if (parsed.data.farm_id && parsed.data.farm_id !== existing.farm_id && !targetFarm)
        return errorResponse(c, "NOT_FOUND", "The selected parent farm was not found", 404);
      const nextFarmId = targetFarm?.id || existing.farm_id;
      if (parsed.data.block_code || nextFarmId !== existing.farm_id) {
        const nextCode = parsed.data.block_code || existing.block_code;
        const dupe =
          await sql`SELECT id FROM farm_blocks WHERE farm_id = ${nextFarmId} AND block_code = ${nextCode} AND id != ${existing.id}`;
        if (dupe[0])
          return errorResponse(
            c,
            "DUPLICATE_CODE",
            "A block with this code already exists on this farm",
            409,
          );
      }

      const merged = { ...existing, ...parsed.data };
      if (
        (parsed.data.size_acres != null && parsed.data.size_acres !== existing.size_acres) ||
        nextFarmId !== existing.farm_id
      ) {
        const farm =
          await sql`SELECT size_acres FROM farms WHERE id = ${nextFarmId}`;
        const allocated =
          await sql`SELECT COALESCE(sum(size_acres), 0) AS total FROM farm_blocks WHERE farm_id = ${nextFarmId} AND status = 'active' AND id != ${existing.id}`;
        const allocation = checkFarmSizeAllocation({
          farmSizeAcres: farm[0]?.size_acres ?? null,
          currentlyAllocatedAcres: Number(allocated[0].total),
          incomingSizeAcres: parsed.data.size_acres ?? existing.size_acres,
          allowOverride:
            parsed.data.allow_size_override &&
            (isAdmin(user) || hasPermission(user.role, "farms.update")),
        });
        if (!allocation.allowed) {
          return errorResponse(
            c,
            "ALLOCATION_EXCEEDS_DECLARED_SIZE",
            `Updating this block to ${parsed.data.size_acres} acres would bring the farm to ${allocation.projectedAcres} acres, exceeding its declared size of ${allocation.declaredAcres} acres`,
            422,
          );
        }
      }

      const rows = await sql`
      UPDATE farm_blocks SET
        farm_id = ${nextFarmId}, block_code = ${merged.block_code ?? existing.block_code}, name = ${merged.name ?? existing.name},
        description = ${"description" in parsed.data ? (parsed.data.description ?? null) : existing.description},
        early_block_classification = ${"early_block_classification" in parsed.data ? (parsed.data.early_block_classification ?? null) : existing.early_block_classification},
        year_planted = ${"year_planted" in parsed.data ? (parsed.data.year_planted ?? null) : existing.year_planted},
        size_acres = ${"size_acres" in parsed.data ? (parsed.data.size_acres ?? null) : existing.size_acres},
        latitude = ${merged.latitude ?? null}, longitude = ${merged.longitude ?? null},
        soil_type = ${merged.soil_type ?? null}, soil_ph = ${merged.soil_ph ?? null}, soil_notes = ${merged.soil_notes ?? null},
        early_harvest = ${"early_block_classification" in parsed.data ? parsed.data.early_block_classification === "Yes" : existing.early_harvest},
        shoot_maturity = ${merged.shoot_maturity ?? existing.shoot_maturity},
        forecast_yield_kg = ${"forecast_yield_kg" in parsed.data ? (parsed.data.forecast_yield_kg ?? null) : existing.forecast_yield_kg},
        actual_yield_kg = ${"actual_yield_kg" in parsed.data ? (parsed.data.actual_yield_kg ?? null) : existing.actual_yield_kg},
        variety = ${"mango_variety" in parsed.data ? (parsed.data.mango_variety ?? null) : existing.variety},
        fruit_fly_pressure = ${"fruit_fly_pressure" in parsed.data ? (parsed.data.fruit_fly_pressure ?? null) : existing.fruit_fly_pressure},
        disease_rating = ${"disease_rating" in parsed.data ? (parsed.data.disease_rating ?? null) : existing.disease_rating},
        disease_severity = ${"disease_severity" in parsed.data ? (parsed.data.disease_severity ?? null) : existing.disease_severity},
        status = ${merged.status ?? existing.status}, operations_started_on = ${merged.operations_started_on || null},
        planting_started_on = ${merged.planting_started_on || null}, updated_by = ${user.id}, updated_at = now()
      WHERE id = ${existing.id}
      RETURNING *, variety AS mango_variety, operations_started_on::text AS operations_started_on, planting_started_on::text AS planting_started_on
    `;
      await sql`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'farm_blocks', ${existing.id}, ${sql.json(existing)}, ${sql.json(rows[0])}, ${requestIp(c.req.raw)})
    `;
      return c.json({ data: rows[0], requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.post(
  "/blocks/:id/deactivate",
  requirePermission("blocks.deactivate"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = deactivateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ||
          "A reason and effective date are required",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const block = await loadBlock(sql, c.req.param("id"), user);
      if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);
      if (block.status !== "active")
        return errorResponse(
          c,
          "INVALID_STATUS",
          "Only an active block can be deactivated",
          422,
        );

      await sql.begin(async (transaction) => {
        await transaction`UPDATE farm_blocks SET status = 'inactive', updated_by = ${user.id}, updated_at = now() WHERE id = ${block.id}`;
        await transaction`
        INSERT INTO block_status_history (id, block_id, action, previous_status, new_status, reason, effective_date, performed_by)
        VALUES (${crypto.randomUUID()}, ${block.id}, 'deactivated', ${block.status}, 'inactive', ${parsed.data.reason}, ${parsed.data.effective_date}, ${user.id})
      `;
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'deactivate', 'farm_blocks', ${block.id}, ${sql.json(parsed.data)}, ${requestIp(c.req.raw)})
      `;
      });
      return c.json({
        data: { id: block.id, status: "inactive" },
        requestId: c.get("requestId"),
      });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.post(
  "/blocks/:id/reactivate",
  requirePermission("blocks.deactivate"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const sql = createDatabase(c.env);
    try {
      const block = await loadBlock(sql, c.req.param("id"), user);
      if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);
      if (block.status === "merged")
        return errorResponse(
          c,
          "BLOCK_MERGED",
          "A merged block cannot be reactivated",
          422,
        );
      if (block.status === "active")
        return errorResponse(
          c,
          "INVALID_STATUS",
          "Block is already active",
          422,
        );

      await sql.begin(async (transaction) => {
        await transaction`UPDATE farm_blocks SET status = 'active', updated_by = ${user.id}, updated_at = now() WHERE id = ${block.id}`;
        await transaction`
        INSERT INTO block_status_history (id, block_id, action, previous_status, new_status, performed_by)
        VALUES (${crypto.randomUUID()}, ${block.id}, 'reactivated', ${block.status}, 'active', ${user.id})
      `;
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'reactivate', 'farm_blocks', ${block.id}, ${requestIp(c.req.raw)})
      `;
      });
      return c.json({
        data: { id: block.id, status: "active" },
        requestId: c.get("requestId"),
      });
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.get(
  "/blocks/:id/history",
  requirePermission("blocks.read"),
  async (c) => {
    const user = c.get("user")!;
    const sql = createDatabase(c.env);
    try {
      const block = await loadBlock(sql, c.req.param("id"), user);
      if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);
      const history = await sql`
      SELECT id, action, previous_status, new_status, reason, effective_date::text AS effective_date, performed_by, created_at
      FROM block_status_history WHERE block_id = ${block.id} ORDER BY created_at DESC
    `;
      return c.json({ data: history, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

// ---------------------------------------------------------------------------
// Block crop inventory (effective-dated: PATCH closes the old row, opens a new one)
// ---------------------------------------------------------------------------

router.post(
  "/blocks/:id/inventory",
  requirePermission("blocks.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = inventoryEntrySchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid inventory entry",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const block = await loadBlock(sql, c.req.param("id"), user);
      if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);

      const row = await sql.begin(async (transaction) => {
        const cropVarietyId = await resolveVarietyId(
          transaction,
          block.organization_id,
          parsed.data.crop_variety_id,
          parsed.data.variety_name,
        );
        const [inserted] = await transaction`
        INSERT INTO block_crop_inventories (
          id, block_id, crop_variety_id, total_trees, productive_trees, non_productive_trees, dead_trees,
          planting_date, notes, created_by, updated_by
        ) VALUES (
          ${crypto.randomUUID()}, ${block.id}, ${cropVarietyId}, ${parsed.data.total_trees}, ${parsed.data.productive_trees},
          ${parsed.data.non_productive_trees}, ${parsed.data.dead_trees}, ${parsed.data.planting_date || null},
          ${parsed.data.notes ?? null}, ${user.id}, ${user.id}
        )
        RETURNING id, block_id, crop_variety_id, total_trees, productive_trees, non_productive_trees, dead_trees,
          planting_date::text AS planting_date, notes, effective_from::text AS effective_from, effective_to::text AS effective_to
      `;
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'create', 'block_crop_inventories', ${inserted.id}, ${sql.json(inserted)}, ${requestIp(c.req.raw)})
      `;
        return inserted;
      });
      return c.json({ data: row, requestId: c.get("requestId") }, 201);
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.patch(
  "/block-inventory/:id",
  requirePermission("blocks.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = inventoryEntryFields.partial().safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid inventory entry",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const [existing] = await sql`
      SELECT bci.*, fb.organization_id AS block_organization_id FROM block_crop_inventories bci
      JOIN farm_blocks fb ON fb.id = bci.block_id
      JOIN farms f ON f.id = fb.farm_id
      WHERE bci.id = ${c.req.param("id")} AND (${isAdmin(user)} OR f.organization_id IS NOT DISTINCT FROM ${user.organizationId})
    `;
      if (!existing)
        return errorResponse(c, "NOT_FOUND", "Inventory record not found", 404);
      if (existing.effective_to)
        return errorResponse(
          c,
          "INVENTORY_CLOSED",
          "This inventory record has already been superseded",
          422,
        );

      const nextTotal = parsed.data.total_trees ?? existing.total_trees;
      const nextProductive =
        parsed.data.productive_trees ?? existing.productive_trees;
      const nextNonProductive =
        parsed.data.non_productive_trees ?? existing.non_productive_trees;
      const nextDead = parsed.data.dead_trees ?? existing.dead_trees;
      if (nextProductive + nextNonProductive + nextDead > nextTotal) {
        return errorResponse(
          c,
          "VALIDATION_ERROR",
          "productive + non-productive + dead trees cannot exceed total trees",
          422,
        );
      }
      const cropVarietyId =
        parsed.data.crop_variety_id || parsed.data.variety_name
          ? await resolveVarietyId(
              sql,
              existing.block_organization_id,
              parsed.data.crop_variety_id,
              parsed.data.variety_name,
            )
          : existing.crop_variety_id;

      const row = await sql.begin(async (transaction) => {
        const today = new Date().toISOString().slice(0, 10);
        await transaction`UPDATE block_crop_inventories SET effective_to = ${today}, updated_by = ${user.id}, updated_at = now() WHERE id = ${existing.id}`;
        const [inserted] = await transaction`
        INSERT INTO block_crop_inventories (
          id, block_id, crop_variety_id, total_trees, productive_trees, non_productive_trees, dead_trees,
          planting_date, notes, effective_from, created_by, updated_by
        ) VALUES (
          ${crypto.randomUUID()}, ${existing.block_id}, ${cropVarietyId}, ${nextTotal}, ${nextProductive}, ${nextNonProductive},
          ${nextDead}, ${parsed.data.planting_date ?? existing.planting_date}, ${parsed.data.notes ?? existing.notes},
          ${today}, ${user.id}, ${user.id}
        )
        RETURNING id, block_id, crop_variety_id, total_trees, productive_trees, non_productive_trees, dead_trees,
          planting_date::text AS planting_date, notes, effective_from::text AS effective_from, effective_to::text AS effective_to
      `;
        await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'block_crop_inventories', ${existing.id},
          ${sql.json(existing)}, ${sql.json(inserted)}, ${requestIp(c.req.raw)})
      `;
        return inserted;
      });
      return c.json({ data: row, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

// ---------------------------------------------------------------------------
// Block activity and progress records
// ---------------------------------------------------------------------------

router.post(
  "/blocks/:id/activities",
  requirePermission("blocks.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = activityPeriodFields.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid activity record",
        422,
      );
    if (!activityDatesAreValid(parsed.data))
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        "An activity end date cannot be before its start date",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const block = await loadBlock(sql, c.req.param("id"), user);
      if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);
      if (block.status === "merged")
        return errorResponse(
          c,
          "BLOCK_MERGED",
          "New activity cannot be recorded against a merged block",
          422,
        );

      const id = crypto.randomUUID();
      const [row] = await sql`
      INSERT INTO farm_activity_periods (
        id, organization_id, farm_id, block_id, activity_type, status, season_year,
        planned_start_date, planned_end_date, actual_start_date, actual_end_date,
        completion_percent, notes, created_by, updated_by
      ) VALUES (
        ${id}, ${block.organization_id}, ${block.farm_id}, ${block.id}, ${parsed.data.activity_type},
        ${parsed.data.status}, ${parsed.data.season_year ?? null}, ${parsed.data.planned_start_date ?? null},
        ${parsed.data.planned_end_date ?? null}, ${parsed.data.actual_start_date ?? null},
        ${parsed.data.actual_end_date ?? null}, ${parsed.data.completion_percent}, ${parsed.data.notes ?? null},
        ${user.id}, ${user.id}
      )
      RETURNING id, farm_id, block_id, activity_type, status, season_year,
        planned_start_date::text AS planned_start_date, planned_end_date::text AS planned_end_date,
        actual_start_date::text AS actual_start_date, actual_end_date::text AS actual_end_date,
        completion_percent, notes, created_at, updated_at
    `;
      await sql`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${user.id}, 'create', 'farm_activity_periods', ${id}, ${sql.json(row)}, ${requestIp(c.req.raw)})
    `;
      return c.json({ data: row, requestId: c.get("requestId") }, 201);
    } finally {
      await closeDatabase(sql);
    }
  },
);

router.patch(
  "/block-activities/:id",
  requirePermission("blocks.update"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = activityPeriodUpdateSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid activity record",
        422,
      );
    if (!Object.keys(parsed.data).length)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        "At least one activity field is required",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const [existing] = await sql`
      SELECT fap.* FROM farm_activity_periods fap
      JOIN farms f ON f.id = fap.farm_id
      WHERE fap.id = ${c.req.param("id")}
        AND (${isAdmin(user)} OR f.organization_id IS NOT DISTINCT FROM ${user.organizationId})
    `;
      if (!existing)
        return errorResponse(c, "NOT_FOUND", "Activity record not found", 404);
      const merged = { ...existing, ...parsed.data };
      if (!activityDatesAreValid(merged))
        return errorResponse(
          c,
          "VALIDATION_ERROR",
          "An activity end date cannot be before its start date",
          422,
        );

      const [row] = await sql`
      UPDATE farm_activity_periods SET
        activity_type = ${merged.activity_type ?? existing.activity_type}, status = ${merged.status ?? existing.status}, season_year = ${merged.season_year ?? null},
        planned_start_date = ${merged.planned_start_date ?? null}, planned_end_date = ${merged.planned_end_date ?? null},
        actual_start_date = ${merged.actual_start_date ?? null}, actual_end_date = ${merged.actual_end_date ?? null},
        completion_percent = ${merged.completion_percent ?? existing.completion_percent}, notes = ${merged.notes ?? null},
        updated_by = ${user.id}, updated_at = now()
      WHERE id = ${existing.id}
      RETURNING id, farm_id, block_id, activity_type, status, season_year,
        planned_start_date::text AS planned_start_date, planned_end_date::text AS planned_end_date,
        actual_start_date::text AS actual_start_date, actual_end_date::text AS actual_end_date,
        completion_percent, notes, created_at, updated_at
    `;
      await sql`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'farm_activity_periods', ${existing.id},
        ${sql.json(existing)}, ${sql.json(row)}, ${requestIp(c.req.raw)})
    `;
      return c.json({ data: row, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

// ---------------------------------------------------------------------------
// Block merging
// ---------------------------------------------------------------------------

async function computeMergeImpact(sql: Database, blockId: string) {
  const [pendingActivities] =
    await sql`SELECT count(*)::int AS n FROM farm_activity_periods WHERE block_id = ${blockId} AND status IN ('planned', 'in_progress', 'delayed')`;
  const [pendingHarvests] =
    await sql`SELECT count(*)::int AS n FROM harvest_periods WHERE block_id = ${blockId} AND status IN ('planned', 'active')`;
  const [pendingCropPlans] =
    await sql`SELECT count(*)::int AS n FROM crop_plans WHERE block_id = ${blockId} AND status NOT IN ('completed', 'cancelled')`;
  return {
    block_id: blockId,
    pending_activity_periods: pendingActivities.n,
    pending_harvest_periods: pendingHarvests.n,
    pending_crop_plans: pendingCropPlans.n,
    has_pending_work:
      pendingActivities.n + pendingHarvests.n + pendingCropPlans.n > 0,
  };
}

router.get(
  "/blocks/merge/:blockId/impact",
  requirePermission("blocks.merge"),
  async (c) => {
    const user = c.get("user")!;
    const sql = createDatabase(c.env);
    try {
      const block = await loadBlock(sql, c.req.param("blockId"), user);
      if (!block) return errorResponse(c, "NOT_FOUND", "Block not found", 404);
      const impact = await computeMergeImpact(sql, block.id);
      return c.json({ data: impact, requestId: c.get("requestId") });
    } finally {
      await closeDatabase(sql);
    }
  },
);

export async function mergeBlocks(
  sql: Database,
  params: {
    organizationId: string | null;
    userId: string;
    farmId: string;
    sourceBlockIds: string[];
    destinationBlockId: string;
    effectiveDate: string;
    reason: string;
    idempotencyKey: string;
    ipAddress: string;
  },
): Promise<{ status: "created" | "already_exists"; mergeId: string }> {
  const existingMerge = await sql`
    SELECT id FROM block_merges WHERE organization_id IS NOT DISTINCT FROM ${params.organizationId} AND idempotency_key = ${params.idempotencyKey}
  `;
  if (existingMerge[0])
    return { status: "already_exists", mergeId: existingMerge[0].id };

  const candidateBlocks = await sql`
    SELECT id, farm_id, status FROM farm_blocks WHERE id = ANY(${[...params.sourceBlockIds, params.destinationBlockId]})
  `;
  const byId = new Map(candidateBlocks.map((b) => [b.id, b]));
  const sourceBlocks = params.sourceBlockIds
    .map((id) => byId.get(id))
    .filter((b): b is NonNullable<typeof b> =>
      Boolean(b),
    ) as MergeCandidateBlock[];
  const destinationBlock = (byId.get(params.destinationBlockId) ||
    null) as MergeCandidateBlock | null;
  if (sourceBlocks.length !== params.sourceBlockIds.length)
    throw new MergeValidationError("One or more source blocks were not found");

  const eligibility = isMergeEligible(
    params.farmId,
    sourceBlocks,
    destinationBlock,
  );
  if (!eligibility.eligible)
    throw new MergeValidationError(
      eligibility.reason || "Blocks are not eligible to merge",
    );

  const impactSnapshot = await Promise.all(
    params.sourceBlockIds.map((id) => computeMergeImpact(sql, id)),
  );

  const mergeId = crypto.randomUUID();
  await sql.begin(async (transaction) => {
    try {
      await transaction`
        INSERT INTO block_merges (id, organization_id, farm_id, destination_block_id, effective_date, reason, idempotency_key, impact_snapshot, created_by)
        VALUES (${mergeId}, ${params.organizationId}, ${params.farmId}, ${params.destinationBlockId}, ${params.effectiveDate}, ${params.reason}, ${params.idempotencyKey}, ${sql.json(impactSnapshot)}, ${params.userId})
      `;
    } catch (error) {
      if (error instanceof Error && /idempotency/.test(error.message))
        throw new MergeIdempotencyConflict();
      throw error;
    }
    for (const source of sourceBlocks) {
      await transaction`
        INSERT INTO block_merge_sources (id, block_merge_id, source_block_id, pre_merge_status, pre_merge_snapshot)
        VALUES (${crypto.randomUUID()}, ${mergeId}, ${source.id}, ${source.status}, ${sql.json({ id: source.id, farm_id: source.farm_id, status: source.status })})
      `;
      await transaction`
        UPDATE farm_blocks SET status = 'merged', merged_into_block_id = ${params.destinationBlockId},
          merge_effective_date = ${params.effectiveDate}, updated_by = ${params.userId}, updated_at = now()
        WHERE id = ${source.id}
      `;
    }
    await transaction`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${params.userId}, 'block_merge', 'farm_blocks', ${params.destinationBlockId},
        ${sql.json({ source_block_ids: params.sourceBlockIds, effective_date: params.effectiveDate, reason: params.reason })}, ${params.ipAddress})
    `;
  });
  return { status: "created", mergeId };
}

export class MergeValidationError extends Error {}
export class MergeIdempotencyConflict extends Error {}

router.post(
  "/blocks/merge",
  requirePermission("blocks.merge"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = mergeSchema.safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid merge request",
        422,
      );
    if (
      parsed.data.source_block_ids.includes(parsed.data.destination_block_id)
    ) {
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        "Destination block cannot also be a source block",
        422,
      );
    }

    const sql = createDatabase(c.env);
    try {
      const farm = await loadFarm(sql, parsed.data.farm_id, user);
      if (!farm) return errorResponse(c, "NOT_FOUND", "Farm not found", 404);

      try {
        const result = await mergeBlocks(sql, {
          organizationId: farm.organization_id,
          userId: user.id,
          farmId: farm.id,
          sourceBlockIds: parsed.data.source_block_ids,
          destinationBlockId: parsed.data.destination_block_id,
          effectiveDate: parsed.data.effective_date,
          reason: parsed.data.reason,
          idempotencyKey: parsed.data.idempotency_key,
          ipAddress: requestIp(c.req.raw),
        });
        return c.json(
          {
            data: { merge_id: result.mergeId, status: result.status },
            requestId: c.get("requestId"),
          },
          result.status === "created" ? 201 : 200,
        );
      } catch (error) {
        if (error instanceof MergeValidationError) {
          const message = /same farm/i.test(error.message)
            ? error.message
            : error.message;
          const code = /same farm/i.test(error.message)
            ? "CROSS_FARM_MERGE_REJECTED"
            : "INELIGIBLE_SOURCE_BLOCK";
          return errorResponse(c, code, message, 422);
        }
        if (error instanceof MergeIdempotencyConflict) {
          return errorResponse(
            c,
            "DUPLICATE_MERGE",
            "A merge with this idempotency key is already in progress",
            409,
          );
        }
        throw error;
      }
    } finally {
      await closeDatabase(sql);
    }
  },
);

// ---------------------------------------------------------------------------
// Crop varieties
// ---------------------------------------------------------------------------

router.get("/crop-varieties", requirePermission("blocks.read"), async (c) => {
  const user = c.get("user")!;
  const sql = createDatabase(c.env);
  try {
    const rows = await sql`
      SELECT * FROM crop_varieties
      WHERE (${isAdmin(user)} OR organization_id IS NOT DISTINCT FROM ${user.organizationId}) AND is_active = true
      ORDER BY name
    `;
    return c.json({ data: rows, requestId: c.get("requestId") });
  } finally {
    await closeDatabase(sql);
  }
});

router.post(
  "/crop-varieties",
  requirePermission("blocks.create"),
  requireCsrf(),
  async (c) => {
    const user = c.get("user")!;
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(120),
        code: z.string().trim().max(50).optional(),
      })
      .safeParse(await parseBody(c));
    if (!parsed.success)
      return errorResponse(
        c,
        "VALIDATION_ERROR",
        "A variety name is required",
        422,
      );

    const sql = createDatabase(c.env);
    try {
      const existing =
        await sql`SELECT id FROM crop_varieties WHERE name = ${parsed.data.name} AND organization_id IS NOT DISTINCT FROM ${user.organizationId}`;
      if (existing[0])
        return errorResponse(
          c,
          "DUPLICATE_VARIETY",
          "This variety already exists",
          409,
        );
      const id = crypto.randomUUID();
      const rows = await sql`
      INSERT INTO crop_varieties (id, organization_id, name, code) VALUES (${id}, ${user.organizationId}, ${parsed.data.name}, ${parsed.data.code || null})
      RETURNING *
    `;
      return c.json({ data: rows[0], requestId: c.get("requestId") }, 201);
    } finally {
      await closeDatabase(sql);
    }
  },
);

export default router;
