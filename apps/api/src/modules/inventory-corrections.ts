import type { Database } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';
type Row = { id: string; entity_name: string; organization_id: string | null; data: Record<string, any>; created_at?: Date | string; deleted?: boolean };
export class InventoryCorrectionError extends Error { constructor(message: string, public status: 404 | 409 | 422 = 409) { super(message); } }
const quantity = (value: unknown) => { const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new InventoryCorrectionError('Enter a valid non-negative quantity.',422); return number; };
const effect = (data: Record<string, any>) => data.movement_type === 'in' ? quantity(data.quantity) : data.movement_type === 'out' ? -quantity(data.quantity) : data.movement_type === 'adjustment' && data.quantity_before != null ? quantity(data.quantity) - quantity(data.quantity_before) : NaN;
const sameStock = (movement: Row, stock: Row) => movement.data.stock_item_id ? movement.data.stock_item_id === stock.id : movement.data.product_name === stock.data.product_name && movement.data.warehouse_name === stock.data.warehouse_name;

export function planInventoryCorrection(rows: Row[], operation: 'create'|'update'|'delete', id: string, payload: Record<string, any>, organizationId: string|null): Row[] {
  rows = rows.filter(row => row.organization_id === organizationId);
  const old = rows.find(row => row.id === id && row.entity_name === 'StockMovement');
  if (operation !== 'create' && !old) throw new InventoryCorrectionError('Movement not found.',404);
  if (old && ['quantity_before','balance_after','inventory_ledger'].some(key => key in payload && payload[key] !== old.data[key])) throw new InventoryCorrectionError('Movement balances are calculated from stock history. Correct the movement quantity or record a new adjustment instead.');
  const data = { ...old?.data, ...payload };
  if (old && (old.data.activity_id || old.data.source_activity_id || old.data.batch_number || old.data.input_id || old.data.farm_input_id)) throw new InventoryCorrectionError('Correct this generated stock movement through its source activity, input application or harvest record.');
  if (old && ['stock_item_id','product_name','warehouse_name'].some(key => key in payload && payload[key] !== old.data[key])) throw new InventoryCorrectionError('A movement cannot be reassigned to another stock item or warehouse.');
  const stocks = rows.filter(row=>row.entity_name === 'StockItem' && sameStock({id,entity_name:'StockMovement',organization_id:organizationId,data},row));
  if (stocks.length !== 1) throw new InventoryCorrectionError('The stock item is missing or ambiguous. Correct its stock record before changing this movement.');
  const stock = stocks[0];
  const later = old ? rows.filter(row=>row.entity_name==='StockMovement' && row.id!==id && sameStock(row,stock) && (!row.created_at || !old.created_at || new Date(row.created_at) >= new Date(old.created_at))) : [];
  const newMovement = { id, entity_name:'StockMovement', organization_id:organizationId, ...old, data, ...(operation==='delete'?{deleted:true}:{}) };
  const monetaryChange = operation!=='update' || ['quantity','movement_type'].some(key=>key in payload && payload[key]!==old?.data[key]);
  if (!monetaryChange) return [newMovement];
  if (later.some(row=>row.data.movement_type==='adjustment')) throw new InventoryCorrectionError('A later stock count adjustment exists. Preserve this history and record a new adjustment for the current stock.');
  const onHand = quantity(stock.data.quantity_on_hand);
  if (operation==='create') data.quantity_before = onHand;
  if (!['in','out','adjustment'].includes(data.movement_type)) throw new InventoryCorrectionError('Choose inbound, outbound or adjustment.',422);
  const previousEffect = old ? effect(old.data) : 0;
  const nextEffect = operation==='delete' ? 0 : effect(data);
  if (!Number.isFinite(previousEffect) || !Number.isFinite(nextEffect)) throw new InventoryCorrectionError('This legacy adjustment has no before balance. Preserve it and record a new stock adjustment instead.');
  const delta = nextEffect - previousEffect;
  const nextQuantity = onHand + delta;
  if (nextQuantity < quantity(stock.data.quantity_reserved ?? 0)) throw new InventoryCorrectionError('This correction would use stock that is unavailable or reserved.');
  data.stock_item_id = stock.id; data.inventory_ledger = true;
  data.balance_after = operation==='create' ? nextQuantity : quantity(old!.data.balance_after ?? onHand) + delta;
  if (data.balance_after < 0 || later.some(row=>['quantity_before','balance_after'].some(key => row.data[key] != null && quantity(row.data[key])+delta<0))) throw new InventoryCorrectionError('This correction would make a historical stock balance negative.');
  return [newMovement,{...stock,data:{...stock.data,quantity_on_hand:nextQuantity}},...later.filter(row=>row.data.balance_after!=null || row.data.quantity_before!=null).map(row=>({...row,data:{...row.data,...(row.data.balance_after!=null?{balance_after:quantity(row.data.balance_after)+delta}:{}),...(row.data.quantity_before!=null?{quantity_before:quantity(row.data.quantity_before)+delta}:{})}}))];
}

export async function mutateInventoryMovement(sql: Database, operation: 'create'|'update'|'delete', id: string, payload: Record<string,any>, user: AuthUser, ip: string) {
  return sql.begin(async tx => {
    await tx`LOCK TABLE entity_records IN SHARE ROW EXCLUSIVE MODE`;
    const rows = await tx<Row[]>`SELECT id,entity_name,organization_id,data,created_at FROM entity_records WHERE entity_name IN ('StockItem','StockMovement') AND (${['super_admin','admin'].includes(user.role)} OR organization_id IS NOT DISTINCT FROM ${user.organizationId})`;
    const organizationId = operation==='create' ? user.organizationId : rows.find(row=>row.id===id && row.entity_name==='StockMovement')?.organization_id;
    if (organizationId === undefined) throw new InventoryCorrectionError('Movement not found.',404);
    const changes = planInventoryCorrection(rows,operation,id,payload,organizationId);
    let result: {id:string;data:unknown;created_at:Date;updated_at:Date} | undefined;
    for (const change of changes) {
      const old = rows.find(row=>row.id===change.id);
      if (change.deleted) await tx`DELETE FROM entity_records WHERE id=${change.id} AND entity_name=${change.entity_name} AND organization_id IS NOT DISTINCT FROM ${organizationId}`;
      else if (old) { const [saved] = await tx<{id:string;data:unknown;created_at:Date;updated_at:Date}[]>`UPDATE entity_records SET data=${tx.json(change.data)},updated_by=${user.id},updated_at=now() WHERE id=${change.id} AND entity_name=${change.entity_name} AND organization_id IS NOT DISTINCT FROM ${organizationId} RETURNING *`; if(change.id===id) result=saved; }
      else { const [saved] = await tx<{id:string;data:unknown;created_at:Date;updated_at:Date}[]>`INSERT INTO entity_records(id,entity_name,organization_id,data,created_by,updated_by) VALUES(${change.id},${change.entity_name},${organizationId},${tx.json(change.data)},${user.id},${user.id}) RETURNING *`; if(change.id===id) result=saved; }
      await tx`INSERT INTO audit_events(id,user_id,action,target_table,record_id,old_values,new_values,ip_address) VALUES(${crypto.randomUUID()},${user.id},${change.deleted?'delete':old?'update':'create'},${change.entity_name},${change.id},${old?tx.json(old.data):null},${change.deleted?null:tx.json(change.data)},${ip})`;
    }
    return result;
  });
}
