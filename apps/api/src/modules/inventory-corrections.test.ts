import { describe,it,expect } from 'vitest';
import { planInventoryCorrection } from './inventory-corrections.js';
const stock = {id:'s',entity_name:'StockItem',organization_id:'org',data:{product_name:'Mango',warehouse_name:'Store',quantity_on_hand:15,quantity_reserved:0}};
const movement = {id:'m',entity_name:'StockMovement',organization_id:'org',created_at:'2026-11-01',data:{product_name:'Mango',warehouse_name:'Store',movement_type:'in',quantity:5,balance_after:15}};
describe('stock movement corrections',()=>{
 it('creates movement and stock balance in one plan',()=>{ const changes=planInventoryCorrection([stock],'create','new',{product_name:'Mango',warehouse_name:'Store',movement_type:'out',quantity:3},'org');expect(changes[1].data.quantity_on_hand).toBe(12);expect(changes[0].data.quantity_before).toBe(15); });
 it('reverses the original contribution when edited or deleted',()=>{expect(planInventoryCorrection([stock,movement],'update','m',{quantity:2},'org')[1].data.quantity_on_hand).toBe(12);expect(planInventoryCorrection([stock,movement],'delete','m',{},'org')[1].data.quantity_on_hand).toBe(10);});
 it('preserves reservations and refuses ambiguous legacy adjustments',()=>{expect(()=>planInventoryCorrection([{...stock,data:{...stock.data,quantity_reserved:14}},movement],'delete','m',{},'org')).toThrow('reserved');expect(()=>planInventoryCorrection([stock,{...movement,data:{...movement.data,movement_type:'adjustment'}}],'delete','m',{},'org')).toThrow('legacy adjustment');});
 it('does not edit another organization or generated source movement',()=>{expect(()=>planInventoryCorrection([stock,movement],'delete','m',{},'other')).toThrow('not found');expect(()=>planInventoryCorrection([stock,{...movement,data:{...movement.data,activity_id:'a'}}],'update','m',{quantity:1},'org')).toThrow('source');});
 it('rejects replay across a later stock count adjustment',()=>{expect(()=>planInventoryCorrection([stock,movement,{...movement,id:'later',created_at:'2026-11-02',data:{...movement.data,movement_type:'adjustment'}}],'update','m',{quantity:2},'org')).toThrow('later stock count');});
 it('refuses direct changes to derived movement balances',()=>{
  const adjustment={...movement,data:{...movement.data,movement_type:'adjustment',quantity_before:10,quantity:15,inventory_ledger:true}};
  for(const payload of [{quantity_before:0},{balance_after:0},{inventory_ledger:false}]) expect(()=>planInventoryCorrection([stock,adjustment],'update','m',payload,'org')).toThrow();
 });
 it('shifts later before and after balances together and preserves absolute adjustment semantics',()=>{
  const later={...movement,id:'later',created_at:'2026-11-02',data:{...movement.data,quantity_before:15,balance_after:20}};
  const changes=planInventoryCorrection([{...stock,data:{...stock.data,quantity_on_hand:20}},movement,later],'update','m',{quantity:10},'org');
  expect(changes.find(row=>row.id==='later')!.data).toMatchObject({quantity_before:20,balance_after:25});
  const converted=planInventoryCorrection(changes,'update','later',{movement_type:'adjustment',quantity:20},'org');
  expect(converted.find(row=>row.id==='s')!.data.quantity_on_hand).toBe(20);
 });
});
