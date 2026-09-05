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

const buildInitialValues = (fields) => (
  fields.reduce((values, field) => ({
    ...values,
    [field.name]: field.defaultValue ?? '',
  }), {})
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
}) {
  const { toast } = useToast();
  const initialValues = useMemo(() => ({
    ...buildInitialValues(fields),
    ...(providedInitialValues || {}),
  }), [fields, providedInitialValues]);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setValues(initialValues);
  }, [initialValues, open]);

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        <Label htmlFor={field.name} className={formVariant === 'daily-activity-log' ? 'mb-1 block text-[10px] font-semibold text-slate-600' : undefined}>
          {field.label}
        </Label>
        {field.type === 'select' ? (
          <Select value={value} onValueChange={(nextValue) => updateValue(field.name, nextValue)}>
            <SelectTrigger id={field.name} className={formVariant === 'daily-activity-log' ? 'h-8 border-slate-200 bg-white text-[11px] shadow-sm' : undefined}>
              <SelectValue placeholder={field.placeholder || 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
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
            className={formVariant === 'daily-activity-log' ? 'min-h-[84px] resize-y border-slate-200 bg-white text-[11px] shadow-sm placeholder:text-slate-400' : undefined}
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
            className={formVariant === 'daily-activity-log' ? 'h-8 border-slate-200 bg-white text-[11px] shadow-sm' : undefined}
          />
        ) : (
          <Input
            id={field.name}
            type={field.type || 'text'}
            required={field.required}
            value={value}
            onChange={(event) => updateValue(field.name, event.target.value)}
            placeholder={field.placeholder}
            className={formVariant === 'daily-activity-log' ? 'h-8 border-slate-200 bg-white text-[11px] shadow-sm placeholder:text-slate-400' : undefined}
          />
        )}
      </div>
    );
  };

  const dailyActivityFields = Object.fromEntries(fields.map((field) => [field.name, field]));
  const dailyField = (name, className) => renderField(dailyActivityFields[name], className);
  const DailySection = ({ title: sectionTitle, icon: Icon, tone, children, className = '' }) => (
    <section className={`rounded-lg border p-3 ${tone} ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <h3 className="text-xs font-semibold">{sectionTitle}</h3>
      </div>
      {children}
    </section>
  );

  const dailyActivityForm = formVariant === 'daily-activity-log';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={buttonClassName}>
          <ButtonIcon className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className={dailyActivityForm ? 'max-h-[calc(100vh-1rem)] overflow-y-auto border-slate-200 bg-[#fdfefd] p-3 shadow-2xl sm:max-w-[49rem] sm:rounded-xl' : 'max-h-[90vh] overflow-y-auto sm:max-w-xl'}>
        {dailyActivityForm ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid gap-2.5 md:grid-cols-2">
                <DailySection title="Activity details" icon={CalendarDays} tone="border-[#ebebeb] bg-[#f7f7f7] text-[#2E7D32]">
                  <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {dailyField('activity_date')}
                    {dailyField('title')}
                    {dailyField('item_tag')}
                    {dailyField('quantity_used')}
                  </div>
                </DailySection>
                <DailySection title="Assignment" icon={UserRound} tone="border-[#ebebeb] bg-[#f7f7f7] text-[#2E7D32]">
                  <div className="grid gap-y-3">
                    {dailyField('responsible')}
                    {dailyField('contact')}
                  </div>
                </DailySection>
              </div>

              <DailySection title="Farm context" icon={Sprout} tone="border-[#ebebeb] bg-[#f7f7f7] text-[#2E7D32]">
                <div className="grid gap-3 sm:grid-cols-3">
                  {dailyField('block_id')}
                  {dailyField('category')}
                  {dailyField('cost_type')}
                </div>
              </DailySection>

              <div className="grid gap-2.5 md:grid-cols-2">
                <DailySection title="Financials & output" icon={CircleDollarSign} tone="border-[#ebebeb] bg-[#f7f7f7] text-[#2E7D32]">
                  <div className="grid gap-x-3 gap-y-3 sm:grid-cols-3">
                    {dailyField('projected_cost')}
                    {dailyField('actual_cost')}
                    {dailyField('projected_revenue')}
                    {dailyField('actual_revenue')}
                    {dailyField('output_quantity_kg')}
                  </div>
                </DailySection>
                <DailySection title="Notes" icon={FileText} tone="border-[#ebebeb] bg-[#f7f7f7] text-[#2E7D32]">
                  {dailyField('notes')}
                </DailySection>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-8 border-slate-200 px-4 text-[11px] text-slate-600 hover:bg-slate-50">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="h-8 bg-[#2E7D32] px-4 text-[11px] text-white hover:bg-[#9ACD32] hover:text-[#173d24]" disabled={saving}>
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
