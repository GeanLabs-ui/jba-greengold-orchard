export const toolsPreview = [
 ['TL-2025-001','Pruning Shears','Tool','2025-01-12',450,'In Use','Kojo Mensah','Farm A','A1','3 units','',''],
 ['EQ-2024-014','Knapsack Sprayer','Equipment','2024-11-05',1850,'Damaged','Team Bravo','Farm B','B1','1 unit','2025-04-18',220],
 ['MT-2025-031','NPK Fertilizer 15-15-15','Material','2025-04-02',3200,'In Use','Team Alpha','Farm A','A2','12 bags','',''],
 ['MT-2025-044','Fungicide','Material','2025-03-20',980,'Finished','Team Charlie','Farm B','B2','0 litres','',''],
 ['EQ-2024-020','Water Pump','Equipment','2024-10-11',6500,'Available','Store Keeper','Farm A','Store','1 unit','2025-04-24',650],
 ['TL-2025-009','Harvest Crates','Tool','2025-02-08',1200,'In Use','Team Delta','Farm B','B3','24 pcs','',''],
 ['EQ-2023-007','Generator','Equipment','2023-09-15',12000,'Under Repair','Maintenance Team','Farm B','Central Shed','1 unit','2025-04-22',1100],
].map((r) => Object.fromEntries(['equipment_code','equipment_name','category','purchase_date','purchase_cost','status','assigned_operator','farm_assigned','current_location','remaining_quantity','last_maintenance_date','repair_cost'].map((k,i) => [k,r[i]]))).map((r) => ({...r,id:r.equipment_code}));
export const toolsEvents = [
 ['10:40 AM','green','Fertilizer batch MT-2025-031 assigned to Farm A Block A2','Assigned to Team Alpha · 12 bags'],
 ['09:15 AM','blue','Water Pump EQ-2024-020 repair completed','Repaired by AquaFix Ltd. · GH₵650'],
 ['08:20 AM','green','Pruning Shears TL-2025-001 checked out by Kojo Mensah','Farm A / A1 · 3 units'],
 ['Yesterday','gold','Fungicide MT-2025-044 marked finished on Farm B Block B2','Used up · 0 litres remaining'],
 ['Yesterday','red','Knapsack Sprayer EQ-2024-014 reported damaged','Nozzle damage · Reported by Team Bravo'],
];
