import type { Database } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';

export class FarmDeletionError extends Error {
  constructor(public code: string, message: string, public status: 404 | 409 | 422) { super(message); }
}

/** Delete only the profile and its owned inventory/status rows. Never cascade into operations. */
export async function deleteFarmProfile(sql: Database, kind: 'farm' | 'block', id: string, confirmation: string, user: AuthUser, ip: string) {
  const table = kind === 'farm' ? 'farms' : 'farm_blocks';
  return sql.begin(async tx => {
    // A parent row lock also serializes foreign-key inserts against this deletion.
    const rows = kind === 'farm'
      ? await tx`SELECT * FROM farms WHERE id = ${id} AND (${user.role === 'super_admin'} OR organization_id IS NOT DISTINCT FROM ${user.organizationId}) FOR UPDATE`
      : await tx`SELECT fb.* FROM farm_blocks fb JOIN farms f ON f.id = fb.farm_id WHERE fb.id = ${id} AND (${user.role === 'super_admin'} OR f.organization_id IS NOT DISTINCT FROM ${user.organizationId}) FOR UPDATE OF fb`;
    const existing = rows[0];
    if (!existing) throw new FarmDeletionError('NOT_FOUND', `${kind === 'farm' ? 'Farm' : 'Block'} not found`, 404);
    const code = String(kind === 'farm' ? existing.farm_code : existing.block_code);
    if (confirmation !== code) throw new FarmDeletionError('CONFIRMATION_REQUIRED', `Type ${code} to confirm deletion.`, 422);

    // Discover every FK, including future additions, before any cascading DELETE.
    const references = await tx`
      SELECT ns.nspname AS schema_name, child.relname AS table_name, attr.attname AS column_name
      FROM pg_constraint con
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = child.relnamespace
      JOIN pg_attribute attr ON attr.attrelid = child.oid AND attr.attnum = ANY(con.conkey)
      WHERE con.contype = 'f' AND parent_ns.nspname = 'public' AND parent.relname = ${table}
    `;
    const ownedTables = kind === 'farm' ? ['farm_status_history'] : ['block_status_history', 'block_crop_inventories'];
    for (const reference of references) {
      if (reference.schema_name === 'public' && ownedTables.includes(reference.table_name)) continue;
      const linked = await tx`SELECT 1 FROM ${tx(`${reference.schema_name}.${reference.table_name}`)} WHERE ${tx(reference.column_name)} = ${id} LIMIT 1`;
      if (linked.length) {
        const message = reference.table_name === 'farm_blocks'
          ? 'Delete this farm’s blocks first. A farm with blocks cannot be deleted.'
          : `This ${kind} has linked ${String(reference.table_name).replaceAll('_', ' ')} records. Remove or reassign them first, or deactivate the ${kind} to keep its history.`;
        throw new FarmDeletionError('LINKED_RECORDS', message, 409);
      }
    }

    // Legacy operations store their scope in JSON instead of foreign keys.
    // Hold writes while checking so a new JSON reference cannot race the deletion.
    await tx`LOCK TABLE entity_records IN SHARE ROW EXCLUSIVE MODE`;
    const keys = kind === 'farm' ? ['farm_id', 'farm_ids', 'farm_name', 'farm_names', 'farm', 'farm_code', 'shared_scope', 'field_area'] : ['block_id', 'block_ids', 'block_name', 'block_names', 'block_code', 'block', 'farm_block', 'farm_blocks', 'shared_scope', 'field_area'];
    const aliases = [id, existing.name, code].filter(Boolean).map(String);
    const canonicalFarm = aliases.map(name => name.match(/^(?:farm\s*(?:land\s*)?)?([AB])$/i)).find(Boolean);
    if (kind === 'farm' && canonicalFarm) aliases.push(`Farm ${canonicalFarm[1]}`, canonicalFarm[1]);
    if (canonicalFarm || (kind === 'block' && /^[AB][1-5]$/i.test(code))) aliases.push('Farm A&B', 'Farm A & B', 'A&B', 'A & B');
    const names = [...new Set(aliases.map(name => name.trim().toLowerCase()))];
    const legacy = await tx`
      SELECT 1 FROM entity_records er
      WHERE er.entity_name NOT IN ('Farm', 'FarmBlock') AND EXISTS (
        SELECT 1 FROM jsonb_path_query(er.data, '$.** ? (@.type() == "object")') node,
          LATERAL jsonb_each(node) field,
          LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(field.value) = 'array' THEN field.value ELSE jsonb_build_array(field.value) END) item(value)
        WHERE field.key = ANY(${keys}::text[]) AND (
          lower(trim(item.value)) = ANY(${names}::text[])
          OR EXISTS (SELECT 1 FROM regexp_split_to_table(item.value, '[,;[:space:]]+') token WHERE lower(token) = ANY(${names}::text[]))
        )
      ) LIMIT 1
    `;
    if (legacy.length) throw new FarmDeletionError('LINKED_RECORDS', `This ${kind} has linked activity or operational records. Remove or reassign them first, or deactivate the ${kind} to keep its history.`, 409);

    await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, 'delete', ${table}, ${id}, ${tx.json(existing)}, ${ip})`;
    await tx`DELETE FROM ${tx(table)} WHERE id = ${id}`;
    return { id, deleted: true };
  });
}
