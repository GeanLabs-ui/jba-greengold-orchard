import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BLOCK_CODES, FARM_SCOPE_OPTIONS, expandedScopeCodes } from '@/lib/farm-scope';

export default function FarmScopeMultiSelect({ id, value, onChange, options = [] }) {
  const availableCodes = new Set(options.map((option) => option.label));
  const selected = new Set(expandedScopeCodes(value));
  const selectedCodes = BLOCK_CODES.filter((code) => selected.has(code));
  const summary = selectedCodes.length === 10 ? 'Farm A&B' : selectedCodes.join(', ') || 'Select farms and blocks';
  return <Popover>
    <PopoverTrigger asChild>
      <button id={id} type="button" className="flex min-h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-caption" aria-label={`Shared farms / blocks: ${summary}`}>
        <span className="min-w-0 break-words">{summary}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-2">
      <div className="max-h-64 overflow-y-auto" role="group" aria-label="Choose farms and blocks">
        {FARM_SCOPE_OPTIONS.map((option) => {
          const codes = (option.value === 'all' ? BLOCK_CODES : ['A', 'B'].includes(option.value) ? BLOCK_CODES.filter((code) => code.startsWith(option.value)) : [option.value]).filter((code) => availableCodes.has(code));
          if (!codes.length) return null;
          const count = codes.filter((code) => selected.has(code)).length;
          const checked = count === codes.length ? true : count ? 'indeterminate' : false;
          return <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted">
            <Checkbox checked={checked} onCheckedChange={() => {
              const next = new Set(selected);
              codes.forEach((code) => checked === true ? next.delete(code) : next.add(code));
              onChange(BLOCK_CODES.filter((code) => next.has(code)).join(', '));
            }} />
            <span>{option.label}</span>
          </label>;
        })}
      </div>
      <div className="mt-1 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground"><span>{selectedCodes.length} blocks selected</span><button type="button" className="px-2 py-1 hover:text-foreground" onClick={() => onChange('')}>Clear</button></div>
    </PopoverContent>
  </Popover>;
}
