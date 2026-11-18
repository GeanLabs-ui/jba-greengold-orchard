import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function DeleteFarmRecordDialog({ open, onOpenChange, kind, record, onDeleted }) {
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setConfirmation(''); setError(''); } }, [open, record?.id]);
  const code = String((kind === 'farm' ? record?.farm_code : record?.block_code) || '');
  const close = value => { if (!saving) onOpenChange(value); };
  const submit = async event => {
    event.preventDefault();
    if (!code || confirmation !== code || saving) return;
    setSaving(true); setError('');
    try {
      if (kind === 'farm') await base44.farms.deleteFarm(record.id, confirmation);
      else await base44.farms.deleteBlock(record.id, confirmation);
      onOpenChange(false); onDeleted();
    } catch (failure) { setError(failure.message || `Unable to delete this ${kind}.`); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="farm-delete-dialog" style={{ zIndex: 220 }} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onPointerDownOutside={event => { if (saving) event.preventDefault(); }}>
    <DialogHeader><DialogTitle>Delete {kind}</DialogTitle><DialogDescription>Permanently delete {record?.name || code}? This cannot be undone.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{kind === 'farm' ? 'Delete the farm’s blocks first. ' : 'The block’s tree inventory will also be removed. '}Linked activity, harvest, and operational records prevent deletion. You can deactivate the {kind} to keep its history.</p>
      <label className="block space-y-2 text-sm"><span>Type <strong>{code}</strong> to confirm</span><Input aria-label="Confirm record code" autoComplete="off" required value={confirmation} disabled={saving} onChange={event => setConfirmation(event.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => close(false)}>Cancel</Button><Button type="submit" variant="destructive" disabled={!code || confirmation !== code || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete {kind}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
