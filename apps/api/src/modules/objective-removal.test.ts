import { describe,it,expect } from 'vitest';
import { objectiveRemovalError } from './objective-removal.js';
import type { Cycle } from './objective-model.js';
const old = {objectives:[{id:'o',subs:[{id:'s'}],kpis:[{id:'k'}]}]} as Cycle;
describe('objective source preservation',()=>{
 it('blocks removal of objectives with task history',()=>{expect(objectiveRemovalError(old,{objectives:[]} as unknown as Cycle,[{related_objective:'o'}])).toContain('Cancel');});
 it('protects linked sub-objectives and KPIs',()=>{
  const next={objectives:[{id:'o',subs:[],kpis:[]}]} as unknown as Cycle;
  expect(objectiveRemovalError(old,next,[{related_objective:'o',related_sub_objective:'s'}])).toContain('sub-objective');
  expect(objectiveRemovalError(old,next,[{related_objective:'o',related_kpi:'k'}])).toContain('KPI');
 });
 it('permits independent removals and ordinary corrections',()=>{expect(objectiveRemovalError(old,{objectives:[]} as unknown as Cycle,[])).toBeNull();expect(objectiveRemovalError(old,old,[{related_objective:'o',related_kpi:'k'}])).toBeNull();});
});
