import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';

export default function FarmActivationToggle({ record, kind = 'farm', canEdit, onChanged }) {
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const active = record.status === 'active';
  const merged = record.status === 'merged';
  const label = kind === 'block' ? record.block_code || record.name : record.name;
  const statusLabel = active ? 'Active' : merged ? 'Merged' : record.status === 'archived' ? 'Archived' : 'Deactivated';

  const changeStatus = async (checked) => {
    if (pending.current || !canEdit || merged || checked === active) return;
    pending.current = true;
    setSaving(true);
    try {
      const payload = {
        reason: `${kind === 'block' ? 'Block' : 'Farm'} deactivated using the activation toggle`,
        effective_date: new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date()),
      };
      if (kind === 'block') {
        if (checked) await base44.farms.reactivateBlock(record.id);
        else await base44.farms.deactivateBlock(record.id, payload);
      } else if (checked) await base44.farms.reactivate(record.id);
      else await base44.farms.deactivate(record.id, payload);
      await onChanged?.();
      toast.success(`${label} ${checked ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error(error.message || `Unable to change ${kind} status`);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="inline-flex shrink-0 items-center gap-2" aria-busy={saving}>
      <span className={`rounded-md px-2 py-1 text-caption font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
        {statusLabel}
      </span>
      {canEdit && !merged ? (
        <Switch
          checked={active}
          disabled={saving}
          onCheckedChange={changeStatus}
          aria-label={`${active ? 'Deactivate' : 'Activate'} ${kind} ${label}`}
          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-400"
        />
      ) : null}
    </div>
  );
}
