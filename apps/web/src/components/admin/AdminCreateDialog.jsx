import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleDollarSign, FileText, Plus, Save, Sprout, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import AdminActionButton from '@/components/admin/AdminActionButton';
import FarmScopeMultiSelect from '@/components/farm/FarmScopeMultiSelect';
import { scopeLabel } from '@/lib/farm-scope';

const buildInitialValues = (fields) => (
  fields.reduce((values, field) => ({
    ...values,
    [field.name]: field.defaultValue ?? '',
  }), {})
);

// Keep the section type stable so typing does not remount its controls.
const DailySection = ({ title: sectionTitle, icon: Icon, tone, children, className = '' }) => (
  <section className={`rounded-lg border p-3 ${tone} ${className}`}>
    <div className="mb-2 flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0" />
      <h3 className="text-card-title !m-0 !leading-tight">{sectionTitle}</h3>
    </div>
    {children}
  </section>
);

export default function AdminCreateDialog({
  title,
  description,
  buttonLabel,
  fields,
  onCreate,
  onSubmit,
  onCreated,
  submitLabel = 'Save',
  buttonVariant,
  buttonClassName = 'gradient-mango text-white',
  buttonIcon: ButtonIcon = Plus,
  initialValues: providedInitialValues,
  formVariant,
  actionIcon,
}) {
  const { toast } = useToast();
  const initialValues = useMemo(() => ({
    ...buildInitialValues(fields),
    ...(providedInitialValues || {}),
    ...(providedInitialValues && !providedInitialValues.farm_id && scopeLabel(providedInitialValues.farm_name) === 'Farm A&B'
      && fields.some((field) => field.name === 'farm_id' && field.options?.some((option) => option.value === '__all__'))
      ? { farm_id: '__all__' } : {}),
  }), [fields, providedInitialValues]);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!open) {
      setValues(initialValues);
      setSaveError('');
    }
  }, [initialValues, open]);

  const updateValue = (name, value) => {
    setSaveError('');
    setValues((current) => ({ ...current, [name]: value, ...(name === 'farm_id' && fields.some((field) => field.name === 'block_id') ? { block_id: '' } : {}) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaveError('');
    setSaving(true);

    const payload = fields.reduce((next, field) => {
      const rawValue = values[field.name];
      next[field.name] = field.type === 'number' && rawValue !== '' ? Number(rawValue) : rawValue;
      return next;
    }, {});

    try {
      await (onSubmit || onCreate)(payload);
      toast({ title: `${title} saved` });
      setValues(initialValues);
      setOpen(false);
      onCreated?.();
    } catch (error) {
      setSaveError(error?.message || 'Could not save. Please try again.');
      toast({
        title: `Could not save ${title.toLowerCase()}`,
        description: error?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field, className = '') => {
    if (!field) return null;

    const value = values[field.name] ?? '';
    return (
      <div key={field.name} className={className}>
        <Label htmlFor={field.name} className={formVariant === 'daily-activity-log' ? 'mb-1 block text-caption font-semibold text-slate-600' : undefined}>
          {field.label}
        </Label>
        {field.type === 'farm-scope-multi' ? (
          <FarmScopeMultiSelect id={field.name} value={value} options={field.options} onChange={(nextValue) => updateValue(field.name, nextValue)} />
        ) : field.type === 'select' ? (
          <Select required={Boolean(field.required)} value={value} onValueChange={(nextValue) => updateValue(field.name, nextValue === '__farm__' ? '' : nextValue)}>
            <SelectTrigger id={field.name} className={formVariant === 'daily-activity-log' ? 'h-8 border-slate-200 bg-white text-caption shadow-sm' : undefined}>
              <SelectValue placeholder={field.placeholder || 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {field.name === 'block_id' && !field.required && fields.some((item) => item.name === 'farm_id') && <SelectItem value="__farm__">{fields.find((item) => item.name === 'farm_id').options?.find((option) => option.value === values.farm_id)?.label || 'Whole farm'}</SelectItem>}
              {field.options.filter((option) => field.name !== 'block_id' || !fields.some((item) => item.name === 'farm_id') || !option.farmId || !values.farm_id || values.farm_id === '__all__' || option.farmId === values.farm_id).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'textarea' ? (
          <Textarea
            id={field.name}
            required={field.required}
            value={value}
            onChange={(event) => updateValue(field.name, event.target.value)}
            placeholder={field.placeholder}
            className={formVariant === 'daily-activity-log' ? 'min-h-[84px] resize-y border-slate-200 bg-white text-caption shadow-sm placeholder:text-slate-400' : undefined}
          />
        ) : field.type === 'file' ? (
          <Input
            id={field.name}
            type="file"
            required={field.required}
            multiple={field.multiple ?? true}
            accept={field.accept}
            onChange={(event) => updateValue(
              field.name,
              Array.from(event.target.files || []).map((file) => file.name).join(', '),
            )}
            className={formVariant === 'daily-activity-log' ? 'h-8 border-slate-200 bg-white text-caption shadow-sm' : undefined}
          />
        ) : (
          <Input
            id={field.name}
            type={field.type || 'text'}
            step={field.step ?? (formVariant === 'daily-activity-log' && field.type === 'number' ? 'any' : undefined)}
            required={field.required}
            value={value}
            onChange={(event) => updateValue(field.name, event.target.value)}
            placeholder={field.placeholder}
            className={formVariant === 'daily-activity-log' ? 'h-8 border-slate-200 bg-white text-caption shadow-sm placeholder:text-slate-400' : undefined}
          />
        )}
      </div>
    );
  };

  const dailyActivityFields = Object.fromEntries(fields.map((field) => [field.name, field]));
  const dailyField = (name, className) => renderField(dailyActivityFields[name], className);
  const dailyActivityForm = formVariant === 'daily-activity-log';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {actionIcon ? <AdminActionButton action={actionIcon} label={buttonLabel} /> : <Button variant={buttonVariant} className={buttonClassName}>
          <ButtonIcon className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>}
      </DialogTrigger>
      <DialogContent className={dailyActivityForm ? 'max-h-[calc(100vh-1rem)] overflow-y-auto border-slate-200 bg-[#f9fcfa] p-3 shadow-2xl sm:max-w-[49rem] sm:rounded-xl' : 'max-h-[90vh] overflow-y-auto sm:max-w-xl'}>
        {dailyActivityForm ? (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">Enter the task details, then save the activity.</DialogDescription>
            <form onSubmit={handleSubmit} onInvalid={(event) => {
              const field = fields.find((item) => item.name === event.target.id);
              setSaveError(`${field?.label || 'Required field'}: ${event.target.validationMessage}`);
            }} className="space-y-2.5">
              <div className="grid gap-2.5 md:grid-cols-2">
                <DailySection title="Activity details" icon={CalendarDays} tone="border-[#e8f5e9] bg-[#f9fcfa] text-[#2e7d32]">
                  <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {dailyField('activity_date')}
                    {dailyField('item_tag')}
                    {dailyField('title', 'sm:col-span-2')}
                    {dailyField('quantity_used')}
                    {dailyField('status')}
                  </div>
                </DailySection>
                <DailySection title="Assignment" icon={UserRound} tone="border-[#e8f5e9] bg-[#f9fcfa] text-[#2e7d32]">
                  <div className="grid gap-y-3">
                    {dailyField('responsible')}
                    {dailyField('contact')}
                  </div>
                </DailySection>
              </div>

              <DailySection title="Farm context" icon={Sprout} tone="border-[#e8f5e9] bg-[#f9fcfa] text-[#2e7d32]">
                <div className="grid gap-3 sm:grid-cols-3">
                  {dailyField('block_id')}
                  {dailyField('category')}
                  {dailyField('cost_type')}
                  {values.block_id === '__shared__' && dailyField('shared_scope')}
                </div>
              </DailySection>

              <div className="grid gap-2.5 md:grid-cols-2">
                <DailySection title="Financials & output" icon={CircleDollarSign} tone="border-[#e8f5e9] bg-[#f9fcfa] text-[#2e7d32]">
                  <div className="grid gap-x-3 gap-y-3 sm:grid-cols-3">
                    {dailyField('projected_cost', 'grid min-w-0 grid-rows-[1fr_auto]')}
                    {dailyField('actual_cost', 'grid min-w-0 grid-rows-[1fr_auto]')}
                    {dailyField('projected_revenue', 'grid min-w-0 grid-rows-[1fr_auto]')}
                    {dailyField('actual_revenue', 'grid min-w-0 grid-rows-[1fr_auto]')}
                    {dailyField('output_quantity_kg', 'grid min-w-0 grid-rows-[1fr_auto]')}
                  </div>
                </DailySection>
                <DailySection title="Notes" icon={FileText} tone="border-[#e8f5e9] bg-[#f9fcfa] text-[#2e7d32]">
                  {dailyField('notes')}
                </DailySection>
              </div>

              {saveError && <p role="alert" className="text-body-sm text-red-700">{saveError}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-8 border-slate-200 px-4 text-caption text-slate-600 hover:bg-slate-50">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="h-8 bg-[#2e7d32] px-4 text-caption text-white hover:bg-[#c8e6c9] hover:text-[#123524]" disabled={saving}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  {saving ? 'Saving...' : submitLabel}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => renderField(field, field.wide ? 'sm:col-span-2' : ''))}
              </div>
              <Button type="submit" className="w-full gradient-mango text-white" disabled={saving}>
                {saving ? 'Saving...' : submitLabel}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
