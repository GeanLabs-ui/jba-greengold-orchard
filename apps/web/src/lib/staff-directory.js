export function mergeStaffDirectory(employees, accounts) {
  const matched = new Set();
  const rows = employees.map(employee => {
    const account = accounts.find(a => a.id === employee.user_id || a.email?.toLowerCase() === employee.email?.toLowerCase());
    if (!account) return employee;
    matched.add(account.id);
    const full_name = account.full_name || employee.full_name;
    const [first_name, ...rest] = String(full_name || '').trim().split(/\s+/);
    return { ...employee, user_id: account.id, full_name, first_name, last_name: rest.join(' '), account_status: account.status };
  });
  return [...rows, ...accounts.filter(account => !matched.has(account.id)).map(account => {
    const full_name = account.full_name || account.email;
    const [first_name, ...rest] = full_name.split(/\s+/);
    return { id: `account:${account.id}`, account_only: true, user_id: account.id, email: account.email,
      full_name, first_name, last_name: rest.join(' '), status: account.status, workspace_role: account.role };
  })];
}
