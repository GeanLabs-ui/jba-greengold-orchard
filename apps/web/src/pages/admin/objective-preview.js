// Local visual fixture transcribed from the supplied Objectives reference.
export const previewSummary = [['Overall achievement', '68%', '+12%'], ['On Track', 5, '+25%'], ['At Risk', 2, '+1'], ['Behind', 1, '-50%'], ['Completed', 3, '+200%'], ['Open blockers', 2, '-33%']];
export const previewContributions = [['Block A - Main Orchard',82],['Block B - Expansion',71],['Block C - Irrigation Zone',56],['Block D - Young Trees',63],['Nursery',90],['Packing House',48]].map(([label,achievement],i)=>({id:`preview-contribution-${i}`,label,achievement,objective:'preview-1'}));
export const previewFeedback = [
['Esther K. Dapaah','Great progress on harvesting in Block A. Fruit quality is excellent.','2 hours ago','Positive'],
['James K. Mensah','Need to monitor flowering closely due to dry conditions.','5 hours ago','Neutral'],
['Grace Ofori','Post-harvest losses can be reduced once cold storage is live.','1 day ago','Action Required'],
['Emmanuella Adu-boatene','Overall on track. Keep momentum and resolve open blockers.','2 days ago','Positive']
].map(([author,notes,date,sentiment],i)=>({id:`preview-feedback-${i}`,author,notes,date,sentiment,objective:`preview-${Math.min(i+1,3)}`}));
export const previewActivity = [
['Harvesting log synced','Block A - 320 kg harvested','12 min ago'],['Yield KPI updated','Block B yield: 8.4 t/ha (+12%)','36 min ago'],['New blocker reported','Irrigation delay in Block C','1 hour ago'],['Photo evidence uploaded','Harvest quality check - Block A','2 hours ago'],['Task completed','Pruning - Block D','3 hours ago'],['Annual review note added','Yield performance analysis','5 hours ago'],['Post-harvest log synced','Packing house - 180 kg (Grade A)','6 hours ago'],['Blocker resolved','Transport issue - Block B','1 day ago']
].map(([title,description,date],i)=>({id:`preview-activity-${i}`,title,description,date,objective:`preview-${i===1?2:i===6?3:1}`}));
const rows = [
['Harvesting','Farm Management','Emmanuella Adu-boatene','2026-10-14','Complete planned harvesting activities across all farms with quality and traceability.','On Track',85,70,4,5,12,15,1,'Harvesting is 85% complete. Good progress in Block A and B.','Updated 2 hours ago'],
['Increase Mango Yield','Production','James K. Mensah','2026-12-31','Improve mango yield by 20% through soil nutrition, proper pruning and pest management.','At Risk',60,45,3,6,8,18,2,'Flowering is lower than expected due to dry spell. Irrigation adjustment in progress.','Updated 4 hours ago'],
['Reduce Post-Harvest Loss','Post-Harvest','Grace Ofori','2026-12-31','Reduce post-harvest loss from 15% to below 8% through improved handling, storage and transport.','Behind',30,25,1,4,5,12,2,'Cold storage installation pending. Loss rate higher due to transport delays.','Updated 1 day ago']
];
export const previewModels = rows.map(([name,category,owner,end,description,health,outcome,execution,achieved,kpiCount,completed,logCount,open_blockers,note,date],i)=>({
 id:`preview-${i+1}`,code:`OBJ-2026-00${i+1}`,name,category,owner,end,description,health,outcome,execution,open_blockers,start:'2026-01-01',expected:75,priority:'High',department:category,budget:0,cost:0,revenue:0,budget_variance:0,critical_blockers:0,overdue:0,
 kpis:Array.from({length:kpiCount},(_,k)=>({id:`preview-kpi-${i}-${k}`,name:`${name} KPI ${k+1}`,achievement:k<achieved?100:outcome,source:'manual',frequency:'Monthly',unit:'%',direction:'higher',baseline:0,target:100,actual:k<achieved?100:outcome,variance:0,weight:1})),
 logs:Array.from({length:logCount},(_,k)=>({id:`preview-log-${i}-${k}`,title:`${name} task ${k+1}`,activity_date:'2026-10-06',status:k<completed?'Completed':'In Progress',actual_cost:0,output_quantity_kg:0})),
 feedback:[{id:`preview-note-${i}`,notes:note,date,author:owner,type:'Progress Update'}],subs:[],allocations:[],evidence:[],blockers:[],contributions:[]
}));
