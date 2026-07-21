import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={buttonClassName}>
          <ButtonIcon className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const value = values[field.name] ?? '';
              const fieldClassName = field.wide ? 'sm:col-span-2' : '';

              return (
                <div key={field.name} className={fieldClassName}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select value={value} onValueChange={(nextValue) => updateValue(field.name, nextValue)}>
                      <SelectTrigger id={field.name}>
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
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type || 'text'}
                      required={field.required}
                      value={value}
                      onChange={(event) => updateValue(field.name, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Button type="submit" className="w-full gradient-mango text-white" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
