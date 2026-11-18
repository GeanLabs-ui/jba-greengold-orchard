import { useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const isManagedProfileImage = (url) => /^\/api\/v1\/files\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\?preview=1$/i.test(url || '');

export default function ProfileImageField({ file, value, onChange, label, disabled }) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const image = preview || (isManagedProfileImage(value) ? value : '');
  return <div className="profile-image-field rounded-lg border bg-white p-3">
    <p className="mb-2 text-sm font-semibold">{label}</p>
    <div className="flex items-center gap-3">
      {image ? <img src={image} alt={`${label} preview`} className="h-20 w-28 shrink-0 rounded-md object-cover" /> : <span className="grid h-20 w-28 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><ImagePlus /></span>}
      <div className="min-w-0 flex-1">
        <Input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => {
          const next = event.target.files?.[0];
          if (!next) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 5 * 1024 * 1024 || !next.size) {
            setError('Choose a JPG, PNG or WebP image up to 5 MB.'); event.target.value = ''; return;
          }
          setError(''); onChange(next);
        }} />
        {file ? <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>Undo image selection</Button> : null}
        {error ? <p role="alert" className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  </div>;
}
