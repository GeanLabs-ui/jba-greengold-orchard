import { CheckCircle2, CircleDollarSign, CloudSun, Loader2, Plus, Sprout, Target } from 'lucide-react';
import '@/pages/admin/DailyRoutineCheck.css';

const displayDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const money = (value) => `GHS ${Number(value || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
const PageHead = ({ right }) => <div className="drc-page-head drc-page-actions">{right}</div>;
const PanelHead = ({ title, copy }) => <div className="drc-panel-head"><div><h2>{title}</h2><p>{copy}</p></div></div>;
const FinanceRow = ({ label, value, icon: Icon }) => {
  const tone = /revenue/i.test(label) ? 'revenue' : /harvest|grade/i.test(label) ? 'yield' : 'cost';
  return <div className={`drc-finance-row drc-${tone}`}><Icon /><span>{label}</span><b>{value}</b></div>;
};
const Empty = ({ title, copy }) => <div className="drc-empty"><CloudSun /><b>{title}</b><p>{copy}</p></div>;
const Field = ({ label, children }) => <label className="drc-field"><span>{label}</span>{children}</label>;

export const summarizeBudgetHarvest = (financeRecords, harvests) => {
  const planned = financeRecords.reduce((sum, item) => sum + Number(item.planned_amount || item.amount || 0), 0);
  const actual = financeRecords.reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
  const kg = harvests.reduce((sum, item) => sum + Number(item.quantity_harvested_kg || 0), 0);
  const gradeA = harvests.reduce((sum, item) => sum + Number(item.grade_a_kg || 0), 0);
  const revenue = harvests.reduce((sum, item) => sum + Number(item.quantity_harvested_kg || 0) * Number(item.price_per_kg || 0), 0);
  return { planned, actual, kg, gradePct: kg ? Math.round((gradeA / kg) * 100) : 0, revenue };
};

export default function BudgetHarvestView({
  blocks,
  busyKey,
  embedded = false,
  finance,
  financeRecords,
  harvestDialog,
  harvests,
  onAddHarvest,
  onUpdateBudget,
  today,
}) {
  return (
    <>
      <section className={`drc-view active ${embedded ? 'drc-embedded-view' : ''}`}>
        <PageHead right={<button type="button" className="drc-primary gold" onClick={() => harvestDialog.current?.showModal()}><Plus /> Record harvest</button>} />
        <div className="drc-finance-grid">
          <div className="drc-table-shell">
            <table className="drc-table drc-cost-table">
              <thead><tr><th>Cost category</th><th>Planned</th><th>Actual</th><th>Variance</th></tr></thead>
              <tbody>{financeRecords.map((record) => {
                const planned = Number(record.planned_amount || record.amount || 0);
                const actual = Number(record.actual_amount || 0);
                return <tr key={record.id}><td><b>{record.category}</b></td><td className="drc-cost">{money(planned)}</td><td><input className="drc-inline drc-money drc-cost" type="number" min="0" defaultValue={actual} onBlur={(event) => Number(event.target.value) !== actual && onUpdateBudget(record, event.target.value)} /></td><td className={planned - actual < 0 ? 'negative' : 'positive'}>{money(planned - actual)}</td></tr>;
              })}</tbody>
            </table>
          </div>
          <aside className="drc-finance-summary">
            <span>Remaining budget</span><strong>{money(finance.planned - finance.actual)}</strong>
            <FinanceRow label="Planned" value={money(finance.planned)} icon={Target} />
            <FinanceRow label="Actual" value={money(finance.actual)} icon={CircleDollarSign} />
            <FinanceRow label="Harvested" value={`${finance.kg.toLocaleString()} kg`} icon={Sprout} />
            <FinanceRow label="Grade A" value={`${finance.gradePct}%`} icon={CheckCircle2} />
            <FinanceRow label="Revenue" value={money(finance.revenue)} icon={CircleDollarSign} />
          </aside>
        </div>
        <div className="drc-panel drc-harvest-panel">
          <PanelHead title="Harvest & packhouse log" copy="Grade percentage and revenue are calculated from each lot" />
          <div className="drc-table-shell flat">{harvests.length ? (
            <table className="drc-table">
              <thead><tr><th>Date</th><th>Lot</th><th>Block</th><th>Variety</th><th>Harvested</th><th>Grade A</th><th>Grade A %</th><th>Buyer</th><th>Revenue</th></tr></thead>
              <tbody>{harvests.map((harvest) => {
                const harvested = Number(harvest.quantity_harvested_kg || 0);
                const gradeA = Number(harvest.grade_a_kg || 0);
                return <tr key={harvest.id}><td>{displayDate(harvest.harvest_date)}</td><td>{harvest.lot_code || harvest.batch_number}</td><td>{harvest.block_name}</td><td>{harvest.variety || harvest.mango_variety}</td><td className="drc-yield">{harvested} kg</td><td className="drc-yield">{gradeA} kg</td><td className="drc-yield">{harvested ? Math.round((gradeA / harvested) * 100) : 0}%</td><td>{harvest.buyer}</td><td className="drc-revenue">{money(harvested * Number(harvest.price_per_kg || 0))}</td></tr>;
              })}</tbody>
            </table>
          ) : <Empty title="No harvest lots recorded" copy="Grade A performance and revenue will appear here." />}</div>
        </div>
      </section>

      <dialog className="drc-dialog" ref={harvestDialog}>
        <div className="drc-modal-head"><div><span className="drc-eyebrow">Commercial control</span><h2>Record harvest lot</h2></div><button type="button" onClick={() => harvestDialog.current?.close()}>×</button></div>
        <form className="drc-form-grid" onSubmit={onAddHarvest}>
          <Field label="Harvest date"><input name="harvest_date" type="date" required defaultValue={today} /></Field>
          <Field label="Block"><select name="block_id" required>{blocks.map((block) => <option key={block.id} value={block.id}>{block.block_code} · {block.variety}</option>)}</select></Field>
          <Field label="Variety"><select name="variety"><option>Kent</option><option>Keitt</option><option>Black Pearl</option></select></Field>
          <Field label="Lot code"><input name="lot_code" required maxLength="80" /></Field>
          <Field label="Harvested kg"><input name="harvested_kg" type="number" min="0.01" step="0.01" required /></Field>
          <Field label="Grade A kg"><input name="grade_a_kg" type="number" min="0" step="0.01" required /></Field>
          <Field label="Price per kg (GHS)"><input name="price_per_kg" type="number" min="0" step="0.01" required /></Field>
          <Field label="Buyer"><input name="buyer" required maxLength="180" /></Field>
          <div className="drc-form-actions"><button type="button" className="drc-btn" onClick={() => harvestDialog.current?.close()}>Cancel</button><button className="drc-primary" disabled={busyKey === 'harvest'}>{busyKey === 'harvest' ? <Loader2 className="drc-spin" /> : null} Save harvest</button></div>
        </form>
      </dialog>
    </>
  );
}
