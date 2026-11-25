import type { Database } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';

type Data = Record<string, any>;
export type SalesRow = { id: string; entity_name: string; organization_id: string | null; data: Data; created_at?: Date; updated_at?: Date; deleted?: boolean };
type Operation = 'create' | 'update' | 'delete';
export class SalesRecordError extends Error { constructor(message: string, public status: 404 | 409 | 422 = 409) { super(message); } }
const completed = (data: Data) => String(data.status).toLowerCase() === 'completed';
const cents = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) throw new SalesRecordError('Enter a non-negative amount with no more than two decimal places.', 422);
  return Math.round(amount * 100);
};
const linked = (child: Data, parent: SalesRow, kind: 'invoice' | 'order') => child[`${kind}_id`] ? child[`${kind}_id`] === parent.id : Boolean(child[`${kind}_number`] && child[`${kind}_number`] === parent.data[`${kind}_number`]);
const orderPaymentStatus = (invoice: Data) => invoice.status === 'paid' ? 'paid' : Number(invoice.amount_paid) > 0 ? 'partial' : 'pending';
const settlement = (data: Data, paid: number) => {
  if (paid < 0) throw new SalesRecordError('Payment history does not reconcile with the invoice. Review its existing credits before correcting this payment.');
  const total = cents(data.total_amount), balance = ['void','cancelled'].includes(data.status) ? 0 : Math.max(0, total - paid);
  return { ...data, amount_paid: paid / 100, balance_due: balance / 100, status: ['void','cancelled','draft'].includes(data.status) ? data.status : paid > 0 && !balance ? 'paid' : paid > 0 ? 'partial' : 'unpaid' };
};

// Pure plan: no records are changed until every link, amount and dependency validates.
export function planSalesMutation(allRows: SalesRow[], entity: string, operation: Operation, id: string, payload: Data, organizationId: string | null): SalesRow[] {
  const rows = allRows.filter(row => row.organization_id === organizationId);
  const previous = rows.find(row => row.id === id && row.entity_name === entity);
  if (operation !== 'create' && !previous) throw new SalesRecordError('Record not found.', 404);
  const next: SalesRow = { ...(previous || { id, entity_name: entity, organization_id: organizationId }), data: { ...(previous?.data || {}), ...payload }, ...(operation === 'delete' ? { deleted: true } : {}) };
  const changes = new Map<string, SalesRow>([[id,next]]);
  const related = (kind: 'invoice' | 'order', data: Data) => {
    if (!data[`${kind}_id`] && !data[`${kind}_number`]) return undefined;
    const matches = rows.filter(row => row.entity_name === (kind === 'invoice' ? 'Invoice' : 'Order') && linked(data,row,kind));
    if (matches.length !== 1) throw new SalesRecordError(`The linked ${kind} is missing or ambiguous. Correct the reference before saving.`);
    return matches[0];
  };
  const syncOrder = (invoice: SalesRow) => {
    const order = related('order', invoice.data);
    if (!order) return;
    if ((order.data.currency || 'GHS') !== (invoice.data.currency || 'GHS')) throw new SalesRecordError('Linked records must use the same currency.');
    const invoices = rows.filter(row=>row.entity_name==='Invoice' && linked(row.data,order,'order'));
    if (invoices.length !== 1) throw new SalesRecordError('This order has multiple invoices and needs reconciliation before a financial correction.');
    const totalChanged = entity === 'Invoice' && 'total_amount' in payload && cents(invoice.data.total_amount) !== cents(previous!.data.total_amount);
    if (totalChanged && rows.some(row => row.entity_name === 'PaymentAttempt' && linked(row.data, order, 'order'))) throw new SalesRecordError('An online checkout exists. Reconcile or cancel it before changing the order total.');
    changes.set(order.id,{...order,data:{...order.data,...(totalChanged ? {total_amount:invoice.data.total_amount}:{}),payment_status:orderPaymentStatus(invoice.data)}});
  };
  if (entity === 'Payment') {
    if ((!previous && (payload.source === 'gateway' || payload.provider || payload.provider_transaction_id)) || previous && ['provider','provider_transaction_id','source'].some(key=> key in payload && payload[key] !== previous.data[key])) throw new SalesRecordError('Provider settlement metadata is managed by payment verification.');
    const protectedKeys = ['payment_method','payment_date','amount','status','currency','invoice_id','invoice_number','order_id','order_number','payment_reference','provider','provider_transaction_id','source'];
    if (previous && (previous.data.source === 'gateway' || previous.data.provider_transaction_id || previous.data.provider)) {
      if (operation === 'delete' || protectedKeys.some(key=> key in payload && payload[key] !== previous.data[key])) throw new SalesRecordError('Provider-verified receipts cannot be deleted or have settlement values changed. Use the provider refund/reconciliation workflow; notes can be corrected.');
    }
    if (previous && ['invoice_id','invoice_number','order_id','order_number'].some(key=>key in payload && (payload[key] || '') !== (previous.data[key] || ''))) throw new SalesRecordError('An existing payment cannot be reassigned to a different invoice or order.');
    cents(next.data.amount);
    const oldCredit = previous && completed(previous.data) ? cents(previous.data.amount) : 0;
    const newCredit = operation !== 'delete' && completed(next.data) ? cents(next.data.amount) : 0;
    const invoice = related('invoice',next.data);
    const order = related('order',next.data);
    if (!invoice && order) throw new SalesRecordError('Choose the order invoice so its balance can be updated safely.');
    if (invoice) {
      if ((invoice.data.currency || 'GHS') !== (next.data.currency || 'GHS')) throw new SalesRecordError('Payment and invoice currencies must match.');
      const invoiceOrder = related('order',invoice.data);
      if (order && invoiceOrder?.id !== order.id) throw new SalesRecordError('Payment order does not match its invoice.');
      if (operation !== 'delete') next.data = {...next.data,invoice_id:invoice.id,invoice_number:invoice.data.invoice_number,...(invoiceOrder?{order_id:invoiceOrder.id,order_number:invoiceOrder.data.order_number}:{})};
      if (newCredit !== oldCredit) {
        if (['void','cancelled','draft'].includes(invoice.data.status)) throw new SalesRecordError('Restore the invoice before changing its payments.');
        const updated = {...invoice,data:settlement(invoice.data,cents(invoice.data.amount_paid) + newCredit - oldCredit)};
        changes.set(updated.id,updated); syncOrder(updated);
      }
    }
  } else if (entity === 'Invoice') {
    const payments=rows.filter(row=>row.entity_name==='Payment' && linked(row.data,previous!,'invoice'));
    if (operation === 'delete') {
      if (payments.length || cents(previous!.data.amount_paid)>0 || related('order',previous!.data)) throw new SalesRecordError('This invoice has payments or a linked order. Keep the invoice and void it when appropriate; remove dependencies explicitly before deleting.');
    } else {
      if (['invoice_number','order_id','order_number'].some(key=>key in payload && (payload[key]||'')!==(previous!.data[key]||''))) throw new SalesRecordError('Linked invoice references cannot be reassigned.');
      if ('currency' in payload && payload.currency !== previous!.data.currency && payments.length) throw new SalesRecordError('An invoice with payments cannot change currency.');
      if ('currency' in payload && (payload.currency || 'GHS') !== (previous!.data.currency || 'GHS') && related('order', previous!.data)) throw new SalesRecordError('Linked records must use the same currency. Reconcile the linked order before changing currency.');
      if (['amount_paid','balance_due'].some(key=>key in payload && payload[key]!==previous!.data[key])) throw new SalesRecordError('Correct the payment records to change the paid amount or balance.');
      if ('total_amount' in payload || 'status' in payload) {
        if (['void','cancelled','draft'].includes(next.data.status) && cents(previous!.data.amount_paid)>0) throw new SalesRecordError('Correct or refund the payments before voiding a paid invoice.');
        next.data=settlement(next.data,cents(previous!.data.amount_paid)); syncOrder(next);
      }
    }
  } else if (entity === 'Order') {
    const dependencies=rows.filter(row=>row.id!==id && ['Invoice','Payment','Return','Delivery','PaymentAttempt'].includes(row.entity_name) && linked(row.data,previous!,'order'));
    if (operation==='delete' && (dependencies.length || previous!.data.payment_status==='paid')) throw new SalesRecordError('This order has invoices, payments, returns or delivery history. Cancel it or resolve linked records before deleting.');
    if (operation!=='delete') {
      if ('order_number' in payload && payload.order_number!==previous!.data.order_number) throw new SalesRecordError('Order references cannot be reassigned.');
      if ('payment_status' in payload && payload.payment_status !== previous!.data.payment_status) throw new SalesRecordError('Correct the payment records to change the order payment status.');
      if ('currency' in payload && (payload.currency || 'GHS') !== (previous!.data.currency || 'GHS') && dependencies.some(row => ['Invoice','Payment','PaymentAttempt'].includes(row.entity_name))) throw new SalesRecordError('Reconcile linked financial records before changing the order currency.');
      if ('total_amount' in payload && payload.total_amount!==previous!.data.total_amount) {
        cents(next.data.total_amount);
        if (dependencies.some(row=>row.entity_name==='PaymentAttempt')) throw new SalesRecordError('An online checkout exists. Reconcile or cancel it before changing the order total.');
        const invoices=dependencies.filter(row=>row.entity_name==='Invoice');
        if(invoices.length>1) throw new SalesRecordError('This order has multiple invoices and needs reconciliation.');
        if(invoices[0]) {
          const data = settlement({...invoices[0].data,total_amount:next.data.total_amount},cents(invoices[0].data.amount_paid));
          changes.set(invoices[0].id,{...invoices[0],data});
          next.data = {...next.data,payment_status:orderPaymentStatus(data)};
        }
      }
      if (payload.status === 'cancelled' && previous!.data.status !== 'cancelled') {
        // Cancel independent unpaid invoices in the same transaction as the order.
        // Financial history and provider checkouts require explicit reconciliation.
        for (const invoice of dependencies.filter(row => row.entity_name === 'Invoice')) {
          if (cents(invoice.data.amount_paid) > 0
            || dependencies.some(row => row.entity_name === 'PaymentAttempt')
            || rows.some(row => row.entity_name === 'Payment' && (linked(row.data, invoice, 'invoice') || linked(row.data, previous!, 'order')))) continue;
          const updated = changes.get(invoice.id) || invoice;
          changes.set(invoice.id, { ...updated, data: settlement({ ...updated.data, status: 'void' }, 0) });
        }
      }
    }
  }
  return [...changes.values()];
}

export const handlesSalesMutation = (name: string, operation: Operation) => name === 'Payment' || operation !== 'create' && ['Invoice','Order'].includes(name);
export async function mutateSalesRecord(sql: Database, name: string, operation: Operation, id: string, payload: Data, user: AuthUser, ip: string) {
  return sql.begin(async tx => {
    if (operation === 'delete') await tx`LOCK TABLE entity_records IN SHARE ROW EXCLUSIVE MODE`;
    // Match checkout settlement's lock order: orders, attempts, then invoices.
    const allRows=await tx<SalesRow[]>`SELECT id, entity_name, organization_id, data, created_at, updated_at FROM entity_records WHERE entity_name IN ('Order','PaymentAttempt','Invoice','Payment','Return','Delivery') AND (${['super_admin','admin'].includes(user.role)} OR organization_id IS NOT DISTINCT FROM ${user.organizationId}) ORDER BY CASE entity_name WHEN 'Order' THEN 0 WHEN 'PaymentAttempt' THEN 1 WHEN 'Invoice' THEN 2 ELSE 3 END, id FOR UPDATE`;
    const organizationId=operation==='create'?user.organizationId:allRows.find(row=>row.id===id && row.entity_name===name)?.organization_id;
    if(organizationId===undefined) throw new SalesRecordError('Record not found.',404);
    const changes=planSalesMutation(allRows,name,operation,id,payload,organizationId);
    let result: (SalesRow & {created_at: Date; updated_at: Date}) | undefined;
    for(const change of changes) {
      const old=allRows.find(row=>row.id===change.id && row.entity_name===change.entity_name);
      if(change.deleted) await tx`DELETE FROM entity_records WHERE id=${change.id} AND entity_name=${change.entity_name} AND organization_id IS NOT DISTINCT FROM ${organizationId}`;
      else if(old) {
        const [saved]=await tx<(SalesRow & {created_at: Date; updated_at: Date})[]>`UPDATE entity_records SET data=${tx.json(change.data)}, updated_by=${user.id}, updated_at=now() WHERE id=${change.id} AND entity_name=${change.entity_name} AND organization_id IS NOT DISTINCT FROM ${organizationId} RETURNING id, entity_name, organization_id, data, created_at, updated_at`;
        if(change.id===id) result=saved;
      } else {
        const [saved]=await tx<(SalesRow & {created_at: Date; updated_at: Date})[]>`INSERT INTO entity_records(id,entity_name,organization_id,data,created_by,updated_by) VALUES(${change.id},${change.entity_name},${organizationId},${tx.json(change.data)},${user.id},${user.id}) RETURNING id, entity_name, organization_id, data, created_at, updated_at`;
        if(change.id===id) result=saved;
      }
      await tx`INSERT INTO audit_events(id,user_id,action,target_table,record_id,old_values,new_values,ip_address) VALUES(${crypto.randomUUID()},${user.id},${change.deleted?'delete':old?'update':'create'},${change.entity_name},${change.id},${old?tx.json(old.data):null},${change.deleted?null:tx.json(change.data)},${ip})`;
    }
    const previous=allRows.find(row=>row.id===id && row.entity_name===name);
    if (name==='Order' && previous?.data.status==='draft' && result && ['confirmed','processing','packed','dispatched','delivered'].includes(result.data.status)) {
      const existing=await tx`SELECT 1 FROM entity_records WHERE entity_name='Notification' AND data->>'order_id'=${id} AND data->>'type'='order' UNION ALL SELECT 1 FROM audit_events WHERE target_table='Notification' AND action='delete' AND old_values->>'order_id'=${id} AND old_values->>'type'='order' LIMIT 1`;
      if(!existing.length) {
        const notificationId=crypto.randomUUID();
        const alert={title:'Order placed',message:`${result.data.order_number || 'New order'}${result.data.customer_name ? ` · ${result.data.customer_name}` : ''}`,type:'order',notification_type:'order',channel:'Admin',status:'new',order_id:id,record_id:id,entity_name:'Order',destination:`/admin/marketing/orders?order=${encodeURIComponent(id)}`};
        await tx`INSERT INTO entity_records(id,entity_name,organization_id,data,created_by,updated_by) VALUES(${notificationId},'Notification',${organizationId},${tx.json(alert)},${user.id},${user.id})`;
        await tx`INSERT INTO audit_events(id,user_id,action,target_table,record_id,new_values,ip_address) VALUES(${crypto.randomUUID()},${user.id},'create','Notification',${notificationId},${tx.json(alert)},${ip})`;
      }
    }
    return result;
  });
}
