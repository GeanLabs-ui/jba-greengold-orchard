import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BudgetHarvestView, { summarizeBudgetHarvest } from '@/components/farm/BudgetHarvestView';
import { useToast } from '@/components/ui/use-toast';
import { PROGRAMME, PROGRAMME_CODE } from '@/data/dailyRoutineProgramme';
import { subscribeToDataChanges } from '@/lib/data-sync';

const TODAY = new Date().toISOString().slice(0, 10);
const code = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;

export default function FarmDailyBudgetHarvest() {
  const { toast } = useToast();
  const harvestDialog = useRef(null);
  const [financeRecords, setFinanceRecords] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [busyKey, setBusyKey] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [financeRows, harvestRows, blockRows, farmRows] = await Promise.all([
        base44.entities.FarmFinanceRecord.list('category', 250).catch(() => []),
        base44.entities.HarvestBatch.list('-harvest_date', 500).catch(() => []),
        base44.entities.FarmBlock.list('block_code', 250).catch(() => []),
        base44.entities.Farm.list('-created_date', 100).catch(() => []),
      ]);
      setFinanceRecords(financeRows.filter((item) => item.programme_code === PROGRAMME_CODE && item.record_type === 'programme_budget'));
      setHarvests(harvestRows.filter((item) => item.programme_code === PROGRAMME_CODE));
      setBlocks(blockRows.filter((item) => item.programme_code === PROGRAMME_CODE));
      setFarms(farmRows);
    } catch (error) {
      toast({ title: 'Budget and harvest records could not be loaded', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => load({ silent: true }), 160);
    }, ['FarmFinanceRecord', 'HarvestBatch', 'FarmBlock']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [load]);

  const finance = useMemo(() => summarizeBudgetHarvest(financeRecords, harvests), [financeRecords, harvests]);

  const updateBudget = async (record, actual) => {
    setBusyKey(record.id);
    try {
      const updated = await base44.entities.FarmFinanceRecord.update(record.id, {
        actual_amount: Math.max(0, Number(actual || 0)),
        status: Number(actual || 0) > 0 ? 'active' : 'planned',
        updated_from: 'Farm Daily Activities Budget & Harvest',
      });
      setFinanceRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast({ title: 'Budget actual synchronized' });
    } catch (error) {
      toast({ title: 'Budget update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  const addHarvest = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const harvestedKg = Number(form.get('harvested_kg'));
    const gradeAKg = Number(form.get('grade_a_kg'));
    if (gradeAKg > harvestedKg) {
      toast({ title: 'Grade A weight cannot exceed harvested weight', variant: 'destructive' });
      return;
    }
    setBusyKey('harvest');
    try {
      const block = blocks.find((item) => item.id === form.get('block_id'));
      const lotCode = String(form.get('lot_code'));
      const payload = {
        programme_code: PROGRAMME_CODE,
        source: 'Farm Daily Activities Budget & Harvest',
        harvest_code: code('HB'),
        harvest_date: form.get('harvest_date'),
        lot_code: lotCode,
        batch_number: lotCode,
        block_id: block?.id || '',
        block_name: block?.name || '',
        farm_id: block?.farm_id || farms[0]?.id || '',
        farm_name: block?.farm_name || farms[0]?.name || PROGRAMME.name,
        mango_variety: form.get('variety'),
        variety: form.get('variety'),
        quantity_harvested_kg: harvestedKg,
        grade_a_kg: gradeAKg,
        grade_b_kg: Math.max(0, harvestedKg - gradeAKg),
        rejected_kg: 0,
        price_per_kg: Number(form.get('price_per_kg')),
        buyer: form.get('buyer'),
        destination: 'Packhouse',
        qr_code: `QR-${lotCode}`,
        status: 'QC Pending',
      };
      const created = await base44.entities.HarvestBatch.create(payload);
      await Promise.allSettled([
        base44.entities.Harvest.create({ ...payload, quantity_kg: harvestedKg, grade: 'Mixed', status: 'harvested' }),
        base44.entities.HarvestGrade.create({ programme_code: PROGRAMME_CODE, batch_number: lotCode, grade: 'Grade A', quantity_kg: gradeAKg, destination: 'Export/Warehouse' }),
        base44.entities.HarvestGrade.create({ programme_code: PROGRAMME_CODE, batch_number: lotCode, grade: 'Grade B', quantity_kg: Math.max(0, harvestedKg - gradeAKg), destination: 'Local Sales/Processing' }),
        base44.entities.QualityCheck.create({ programme_code: PROGRAMME_CODE, qc_code: code('QC'), inspection_date: form.get('harvest_date'), batch_number: lotCode, block_id: block?.id || '', block_name: block?.name || '', total_quantity: harvestedKg, grade_a_kg: gradeAKg, grade_b_kg: Math.max(0, harvestedKg - gradeAKg), rejected_kg: 0, status: 'Pending', notes: 'Auto-created by Farm Daily Activities Budget & Harvest.' }),
        base44.entities.StockMovement.create({ programme_code: PROGRAMME_CODE, product_name: `${form.get('variety')} harvest ${lotCode}`, warehouse_name: 'Main Packhouse', movement_type: 'in', quantity: harvestedKg, movement_date: form.get('harvest_date') }),
      ]);
      setHarvests((current) => [created, ...current]);
      harvestDialog.current?.close();
      event.currentTarget.reset();
      toast({ title: 'Harvest synchronized across operations' });
    } catch (error) {
      toast({ title: 'Harvest entry failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyKey('');
    }
  };

  if (loading && !financeRecords.length && !harvests.length) return <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading Budget & Harvest…</div>;

  return <div className="drc-page drc-embedded-schedule"><BudgetHarvestView blocks={blocks} busyKey={busyKey} embedded finance={finance} financeRecords={financeRecords} harvestDialog={harvestDialog} harvests={harvests} onAddHarvest={addHarvest} onUpdateBudget={updateBudget} today={TODAY} /></div>;
}
