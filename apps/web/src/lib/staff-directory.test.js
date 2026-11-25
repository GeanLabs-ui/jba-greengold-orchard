import { describe, expect, it } from 'vitest';
import { mergeStaffDirectory } from './staff-directory';

describe('staff directory reconciliation', () => {
  it('uses the current account name and preserves the HR profile without duplicating joined staff', () => {
    const rows = mergeStaffDirectory([{ id:'employee', email:'STAFF@example.test', full_name:'Old Name', department:'Farm', employee_code:'JBA-1' }],
      [{id:'account',email:'staff@example.test',full_name:'Current Staff Name',status:'active'}]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({id:'employee',user_id:'account',full_name:'Current Staff Name',first_name:'Current',last_name:'Staff Name',department:'Farm',employee_code:'JBA-1'});
  });
  it('shows accepted accounts even when older acceptance created no HR record', () => {
    const rows=mergeStaffDirectory([], [{id:'joined',email:'joined@example.test',full_name:'Joined Person',status:'active',role:'finance_officer'}]);
    expect(rows[0]).toMatchObject({id:'account:joined',account_only:true,user_id:'joined',full_name:'Joined Person',workspace_role:'finance_officer'});
  });
});
