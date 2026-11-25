export const orderFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'contact_email', label: 'Customer email', type: 'email' },
  { name: 'contact_phone', label: 'Customer phone' },
  { name: 'order_date', label: 'Order date', type: 'date', required: true },
  { name: 'total_amount', label: 'Total amount', type: 'number', allowDecimals: true, required: true },
  { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: ['draft','confirmed','processing','packed','dispatched','delivered','cancelled'].map(value=>({value,label:value.replaceAll('_',' ')})) },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
];
export const invoiceFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'invoice_date', label: 'Invoice date', type: 'date', required: true },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'total_amount', label: 'Total amount', type: 'number', allowDecimals: true, required: true },
  { name: 'status', label: 'Status', type: 'select', defaultValue: 'unpaid', options: ['unpaid','partial','paid','void'].map(value=>({value,label:value})) },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
];
export const paymentFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'payment_date', label: 'Payment date', type: 'date', required: true },
  { name: 'payment_method', label: 'Method', type: 'select', defaultValue: 'manual', options: ['manual','cash','mobile_money','bank_transfer','card','digital_wallet'].map(value=>({value,label:value.replaceAll('_',' ')})) },
  { name: 'amount', label: 'Amount', type: 'number', allowDecimals: true, required: true },
  { name: 'status', label: 'Status', type: 'select', defaultValue: 'completed', options: ['completed','pending','failed','refunded','cancelled'].map(value=>({value,label:value})) },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
];
export const quotationFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'quote_date', label: 'Quote date', type: 'date', required: true },
  { name: 'valid_until', label: 'Valid until', type: 'date' },
  { name: 'total_amount', label: 'Total amount', type: 'number', allowDecimals: true, required: true },
  { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: ['draft','sent','accepted','rejected','expired'].map(value=>({value,label:value})) },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
];
export const returnFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'return_date', label: 'Return date', type: 'date', required: true },
  { name: 'total_amount', label: 'Amount', type: 'number', allowDecimals: true, required: true },
  { name: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: ['pending','approved','rejected','completed','cancelled'].map(value=>({value,label:value})) },
  { name: 'reason', label: 'Reason', type: 'textarea', wide: true },
];
export function paymentEditFields(payment) {
  return payment.source==='gateway' || payment.provider || payment.provider_transaction_id
    ? paymentFields.filter(field=>['customer_name','notes'].includes(field.name)) : paymentFields;
}
export const salesDeleteDescription = 'Delete only this record after reviewing its details. Linked invoices and orders are kept; deleting a manual payment reverses its recorded invoice credit. Records with dependent history and provider-verified receipts are protected.';
