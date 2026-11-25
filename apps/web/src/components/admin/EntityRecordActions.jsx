import React, { useId, useMemo, useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { canCorrectEntity, editRecordValues, recordLabel } from '@/lib/record-actions';
import AdminCreateDialog from './AdminCreateDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function EntityRecordActions({ entity, record, fields = [], onChanged, label, canEdit = true, canDelete = true, deleteGuard, onUpdate, onDelete, deleteDescription, deleteLabel = 'Delete', deletedLabel = 'deleted' }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const id = useId();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const name = label || recordLabel(record);
  const initialValues = useMemo(() => editRecordValues(record, fields), [record, fields]);
  const editFields = fields.map(field => ({ ...field,
    ...((field.type === 'number' && /amount|cost|price|revenue|wage|salary/i.test(field.name)) ? { allowDecimals: true } : {}),
  }));
  if (!record?.id || !canCorrectEntity(user, entity)) return null;

  const remove = async () => {
    if (deleting || confirmation !== name) return;
    setDeleting(true); setError('');
    try {
      await deleteGuard?.(record);
      await (onDelete ? onDelete(record) : base44.entities[entity].delete(record.id));
      setConfirming(false); setConfirmation('');
      toast({ title: `${name} ${deletedLabel}` });
      onChanged?.();
    } catch (failure) {
      setError(failure?.message || 'Could not delete this record. Please try again.');
    } finally { setDeleting(false); }
  };

  return <div className="flex flex-wrap items-center gap-2" onClick={event => event.stopPropagation()}>
    {canEdit && fields.length > 0 && <AdminCreateDialog title={`Edit ${entity.replace(/([a-z])([A-Z])/g, '$1 $2')}`} description={`Correct ${name}, then save your changes.`}
      buttonLabel="Edit" buttonIcon={Pencil} buttonVariant="outline" buttonClassName="h-8 px-2 text-xs" fields={editFields} initialValues={initialValues}
      submitLabel="Save changes" onSubmit={payload => onUpdate ? onUpdate(record, payload) : base44.entities[entity].update(record.id, payload)} onCreated={onChanged} />}
    {canDelete && <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs text-red-700" aria-label={`${deleteLabel} ${name}`} onClick={() => { setConfirmation(''); setError(''); setConfirming(true); }}><Trash2 className="mr-1 h-3.5 w-3.5" />{deleteLabel}</Button>}
    <Dialog open={confirming} onOpenChange={open => { if (!deleting) setConfirming(open); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{deleteLabel} {name}?</DialogTitle><DialogDescription>{deleteDescription || 'This removes this record. Related records and attachments are not deleted. The previous values remain in the audit history.'}</DialogDescription></DialogHeader>
        <p className="break-all text-sm text-muted-foreground">Record: {record.id}</p>
        <Label htmlFor={id}>Type <strong>{name}</strong> to confirm</Label>
        <Input id={id} value={confirmation} disabled={deleting} autoComplete="off" onChange={event => setConfirmation(event.target.value)} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={deleting} onClick={() => setConfirming(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={deleting || confirmation !== name} onClick={remove}>{deleting ? 'Saving…' : `${deleteLabel} record`}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
