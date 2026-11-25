import { describe, expect, it } from 'vitest';
import { type SalesRow, planSalesMutation } from './sales-records.js';
const row = (entity_name: string, id: string, data: Record<string, any>, organization_id = 'org-1') => ({ entity_name, id, data, organization_id });
const invoice = row('Invoice', 'inv-1', { invoice_number: 'INV-1', order_id: 'ord-1', total_amount: 100, amount_paid: 60, balance_due: 40, status: 'partial', currency: 'GHS', notes: 'keep' });
const order = row('Order', 'ord-1', { order_number: 'ORD-1', total_amount: 100, payment_status: 'partial', currency: 'GHS' });
const payment = row('Payment', 'pay-1', { invoice_id: 'inv-1', order_id: 'ord-1', amount: 40, status: 'completed', currency: 'GHS' });
const plan = (entity: string, operation: 'create'|'update'|'delete', id: string, payload: Record<string, any>, rows: SalesRow[] = [order, invoice, payment]) => planSalesMutation(rows, entity, operation, id, payload, 'org-1');
describe('safe sales corrections', () => {
 it('reconciles payment edit by delta, retaining unrepresented legacy credit and unrelated fields', () => {
  const changes = plan('Payment', 'update', 'pay-1', { amount: 25 });
  expect(changes.find(r=>r.id==='inv-1')!.data).toMatchObject({ amount_paid:45,balance_due:55,status:'partial',notes:'keep' });
  expect(changes.find(r=>r.id==='ord-1')!.data.payment_status).toBe('partial');
 });
 it('reverses credit on payment deletion and keeps all parent records', () => {
  const changes=plan('Payment','delete','pay-1',{});
  expect(changes.find(r=>r.id==='pay-1')!.deleted).toBe(true);
  expect(changes.find(r=>r.id==='inv-1')!.data.amount_paid).toBe(20);
  expect(changes.find(r=>r.id==='ord-1')!.deleted).not.toBe(true);
 });
 it('credits only completed payments and restores unpaid status', () => {
  const rows=[order,{...invoice,data:{...invoice.data,amount_paid:40}},payment];
  const changes=plan('Payment','update','pay-1',{status:'failed'},rows);
  expect(changes.find(r=>r.id==='inv-1')!.data).toMatchObject({amount_paid:0,balance_due:100,status:'unpaid'});
 });
 it('rejects nonfinite, negative and fractional-cent amounts', () => {
  for(const amount of [-1,Infinity,'oops',1.234]) expect(()=>plan('Payment','update','pay-1',{amount})).toThrow();
 });
 it('rejects cross-organization and ambiguous invoice links', () => {
  expect(()=>plan('Payment','create','new',{invoice_id:'inv-1',amount:5,status:'completed',currency:'GHS'},[order,{...invoice,organization_id:'other'}])).toThrow();
  expect(()=>plan('Payment','create','new',{invoice_number:'INV-1',amount:5,status:'completed',currency:'GHS'},[invoice,{...invoice,id:'inv-2'}])).toThrow();
 });
 it('rejects moving payments between invoices and mismatched currencies', () => {
  expect(()=>plan('Payment','update','pay-1',{invoice_id:'inv-2'})).toThrow();
  expect(()=>plan('Payment','update','pay-1',{currency:'USD'})).toThrow();
 });
 it('locks provider settlement values and deletion but permits note corrections', () => {
  const rows=[order,invoice,{...payment,data:{...payment.data,source:'gateway',provider:'stripe'}}];
  expect(()=>plan('Payment','update','pay-1',{amount:30},rows)).toThrow();
  expect(()=>plan('Payment','delete','pay-1',{},rows)).toThrow();
  expect(plan('Payment','update','pay-1',{notes:'corrected'},rows)[0].data.notes).toBe('corrected');
 });
 it('blocks deleting parent records with financial or delivery dependencies', () => {
  expect(()=>plan('Invoice','delete','inv-1',{})).toThrow();
  expect(()=>plan('Order','delete','ord-1',{})).toThrow();
  expect(()=>plan('Order','delete','ord-1',{},[order,row('Delivery','d',{order_id:'ord-1'})])).toThrow();
 });
 it('recalculates invoice balance on total corrections and synchronizes its order', () => {
  const changes=plan('Invoice','update','inv-1',{total_amount:120});
  expect(changes.find(r=>r.id==='inv-1')!.data).toMatchObject({total_amount:120,amount_paid:60,balance_due:60,status:'partial'});
  expect(changes.find(r=>r.id==='ord-1')!.data.total_amount).toBe(120);
 });
 it('never edits records from a different organization', () => {
  expect(()=>plan('Payment','update','pay-1',{amount:20},[{...payment,organization_id:'other'}])).toThrow();
 });
 it('updates the order payment status when a total correction changes invoice settlement', () => {
  const rows=[{...order,data:{...order.data,payment_status:'paid'}},{...invoice,data:{...invoice.data,amount_paid:100,balance_due:0,status:'paid'}}];
  const changes=plan('Order','update','ord-1',{total_amount:200},rows);
  expect(changes.find(r=>r.id==='inv-1')!.data).toMatchObject({total_amount:200,status:'partial',balance_due:100});
  expect(changes.find(r=>r.id==='ord-1')!.data.payment_status).toBe('partial');
 });
 it('blocks invoice total corrections while a linked provider checkout exists', () => {
  expect(()=>plan('Invoice','update','inv-1',{total_amount:120},[order,invoice,row('PaymentAttempt','attempt',{order_id:'ord-1',status:'pending'})])).toThrow('online checkout');
 });
 it('does not change an unrelated historical order total when saving an unchanged invoice total', () => {
  const changes=plan('Invoice','update','inv-1',{total_amount:100,notes:'corrected'},[{...order,data:{...order.data,total_amount:130}},invoice]);
  expect(changes.find(r=>r.id==='ord-1')!.data.total_amount).toBe(130);
 });
 it('rejects direct settlement status and linked currency changes', () => {
  expect(()=>plan('Order','update','ord-1',{payment_status:'paid'})).toThrow();
  expect(()=>plan('Order','update','ord-1',{currency:'USD'})).toThrow();
  expect(()=>plan('Invoice','update','inv-1',{currency:'USD'},[order,invoice])).toThrow();
 });
 it('cancels an unpaid order and voids its unpaid invoice in one plan', () => {
  const unpaid = {...invoice,data:{...invoice.data,amount_paid:0,balance_due:100,status:'unpaid'}};
  const changes = plan('Order','update','ord-1',{status:'cancelled'},[order,unpaid]);
  expect(changes.find(row=>row.id==='ord-1')!.data.status).toBe('cancelled');
  expect(changes.find(row=>row.id==='inv-1')!.data).toMatchObject({status:'void',amount_paid:0,balance_due:0,total_amount:100});
 });
 it('preserves invoices with payment history or provider checkouts when cancelling an order', () => {
  const unpaid = {...invoice,data:{...invoice.data,amount_paid:0,status:'unpaid'}};
  const attempts = row('PaymentAttempt','attempt',{order_id:'ord-1',status:'pending'});
  const failedPayment = {...payment,data:{...payment.data,status:'failed'}};
  for (const rows of [[order,invoice,payment],[order,unpaid,attempts],[order,unpaid,failedPayment]]) {
   const changes = plan('Order','update','ord-1',{status:'cancelled'},rows);
   expect(changes.some(row=>row.entity_name==='Invoice')).toBe(false);
  }
 });
 it('voids and restores invoice balances through derived settlement rather than direct balance writes', () => {
  const unpaid = {...invoice,data:{...invoice.data,amount_paid:0,balance_due:100,status:'unpaid'}};
  const voided = plan('Invoice','update','inv-1',{status:'void'},[order,unpaid]).find(row=>row.id==='inv-1')!;
  expect(voided.data).toMatchObject({status:'void',balance_due:0});
  expect(plan('Invoice','update','inv-1',{status:'unpaid'},[order,voided]).find(row=>row.id==='inv-1')!.data).toMatchObject({status:'unpaid',balance_due:100});
 });
});
