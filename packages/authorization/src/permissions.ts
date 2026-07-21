export type Role =
  | 'super_admin'
  | 'admin'
  | 'farm_manager'
  | 'farm_supervisor'
  | 'inventory_officer'
  | 'quality_officer'
  | 'finance_officer'
  | 'hr_officer'
  | 'sales_officer'
  | 'logistics_officer'
  | 'content_editor'
  | 'customer'
  | 'auditor'
  | 'user';

export const permissions = {
  // Farms
  'farms.read': 'Read farm details',
  'farms.create': 'Create a new farm',
  'farms.update': 'Update farm details',
  'farms.delete': 'Delete a farm',
  'farms.approve': 'Approve farm logs',

  // Daily activities
  'activities.read': 'Read activity logs',
  'activities.create': 'Create daily activity',
  'activities.update': 'Update daily activity',
  'activities.approve': 'Approve daily activity',

  // Inventory
  'inventory.read': 'Read stock levels',
  'inventory.issue': 'Issue inventory items',
  'inventory.receive': 'Receive inventory items',
  'inventory.adjust': 'Adjust inventory counts',

  // Finance
  'finance.read': 'Read financial records',
  'finance.create': 'Record finance transactions',
  'finance.approve': 'Approve transactions',

  // Users & Roles
  'users.invite': 'Invite new users',
  'users.disable': 'Disable users',
  'roles.assign': 'Assign roles and permissions',
} as const;

export type Permission = keyof typeof permissions;

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: Object.keys(permissions) as Permission[],
  admin: [
    'farms.read', 'farms.create', 'farms.update', 'farms.approve',
    'activities.read', 'activities.create', 'activities.update', 'activities.approve',
    'inventory.read', 'inventory.issue', 'inventory.receive', 'inventory.adjust',
    'finance.read', 'finance.create', 'finance.approve',
    'users.invite', 'users.disable', 'roles.assign'
  ],
  farm_manager: [
    'farms.read', 'farms.update', 'farms.approve',
    'activities.read', 'activities.create', 'activities.update', 'activities.approve',
    'inventory.read', 'inventory.issue', 'inventory.receive'
  ],
  farm_supervisor: [
    'farms.read',
    'activities.read', 'activities.create', 'activities.update',
    'inventory.read', 'inventory.issue'
  ],
  inventory_officer: [
    'inventory.read', 'inventory.issue', 'inventory.receive', 'inventory.adjust'
  ],
  quality_officer: [
    'farms.read',
    'activities.read', 'activities.approve'
  ],
  finance_officer: [
    'finance.read', 'finance.create', 'finance.approve'
  ],
  hr_officer: [
    'users.invite', 'users.disable'
  ],
  sales_officer: [
    'farms.read', 'inventory.read'
  ],
  logistics_officer: [
    'inventory.read'
  ],
  content_editor: [],
  customer: [],
  auditor: [
    'farms.read', 'activities.read', 'inventory.read', 'finance.read'
  ],
  user: ['farms.read']
};

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === 'super_admin') return true;
  const list = ROLE_PERMISSIONS[role] || [];
  return list.includes(permission);
}
