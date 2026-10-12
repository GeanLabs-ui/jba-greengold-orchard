// Use the same persisted entities as the production and business pages. listAll
// is required: the ordinary list endpoint only returns the first page.
export const dashboardSources = {
  farms: 'Farm', blocks: 'FarmBlock', dailyActivities: 'DailyActivity',
  farmTasks: 'FarmTask', farmProjects: 'FarmProject', risks: 'FarmComplianceRecord', equipment: 'Equipment',
  equipmentUsage: 'EquipmentUsage', reports: 'DailyReport', approvals: 'Approval',
  calendarEvents: 'CalendarEvent', customers: 'Customer', inquiries: 'Inquiry',
  orders: 'Order', invoices: 'Invoice', payments: 'Payment', quotations: 'Quotation',
  returns: 'Return', products: 'Product', newsPosts: 'NewsPost', stock: 'StockItem',
  deliveries: 'Delivery', suppliers: 'Supplier', purchaseOrders: 'PurchaseOrder',
  exports: 'ExportShipment',
};

export async function loadDashboardRecords(entities) {
  const entries = await Promise.all(Object.entries(dashboardSources).map(async ([key, entity]) => {
    try { return [key, await entities[entity].listAll('-created_date')]; }
    catch (error) { throw new Error(`${entity} records could not be loaded: ${error.message}`); }
  }));
  return Object.fromEntries(entries);
}
