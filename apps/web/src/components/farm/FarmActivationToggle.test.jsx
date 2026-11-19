import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmActivationToggle from './FarmActivationToggle';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

const control = vi.hoisted(() => ({ change: null }));
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ onCheckedChange, checked, ...props }) => {
    control.change = onCheckedChange;
    return <button role="switch" aria-checked={checked} {...props} />;
  },
}));
vi.mock('@/api/base44Client', () => ({ base44: { farms: {
  deactivate: vi.fn(), reactivate: vi.fn(), deactivateBlock: vi.fn(), reactivateBlock: vi.fn(),
} } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('farm and block activation toggle', () => {
  beforeEach(() => { vi.resetAllMocks(); control.change = null; });
  const render = (status, props = {}) => renderToStaticMarkup(
    <FarmActivationToggle record={{ id: 'record-1', name: 'Farm A', block_code: 'A1', status }} canEdit {...props} />,
  );

  it('shows active records with an accessible checked switch', () => {
    const html = render('active');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('Deactivate farm Farm A');
    expect(html).toContain('bg-emerald-50');
  });

  it('keeps deactivated records labelled with a grey unchecked switch', () => {
    const html = render('inactive');
    expect(html).toContain('Deactivated');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('Activate farm Farm A');
    expect(html).toContain('bg-slate-200');
  });

  it('does not expose a mutation switch to viewers or merged blocks', () => {
    expect(render('active', { canEdit: false })).not.toContain('role="switch"');
    expect(render('merged', { kind: 'block' })).toContain('Merged');
    expect(control.change).toBeNull();
  });

  it.each(['farm', 'block'])('persists %s deactivation with its audit reason and date', async (kind) => {
    const onChanged = vi.fn();
    render('active', { kind, onChanged });
    await control.change(false);
    const method = kind === 'block' ? base44.farms.deactivateBlock : base44.farms.deactivate;
    expect(method).toHaveBeenCalledWith('record-1', expect.objectContaining({
      reason: expect.stringContaining('activation toggle'),
      effective_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it.each(['farm', 'block'])('reactivates a %s through the matching endpoint', async (kind) => {
    render('inactive', { kind });
    await control.change(true);
    expect(kind === 'block' ? base44.farms.reactivateBlock : base44.farms.reactivate).toHaveBeenCalledWith('record-1');
  });

  it('retains the saved status and reports failed writes without claiming success', async () => {
    base44.farms.deactivate.mockRejectedValue(new Error('Save failed'));
    const onChanged = vi.fn();
    render('active', { onChanged });
    await control.change(false);
    expect(toast.error).toHaveBeenCalledWith('Save failed');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('ignores duplicate clicks while a status write is pending', async () => {
    let finish;
    base44.farms.deactivate.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render('active');
    const saving = control.change(false);
    await control.change(false);
    expect(base44.farms.deactivate).toHaveBeenCalledOnce();
    finish();
    await saving;
  });
});
