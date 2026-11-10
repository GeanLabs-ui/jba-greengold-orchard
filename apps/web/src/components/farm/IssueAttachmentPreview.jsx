import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SLIDES = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const types = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf', doc: 'application/msword', docx: WORD,
  ppt: 'application/vnd.ms-powerpoint', pptx: SLIDES, txt: 'text/plain',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
};
export const issueAttachmentAccept = Object.keys(types).map(extension => `.${extension}`).join(',');
export const maxIssueAttachmentSize = 32 * 1024 * 1024;

export function issueAttachmentType(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  return Object.hasOwn(types, extension) ? types[extension] : undefined;
}

async function readOfficePreview(blob, type) {
  const { unzipSync } = await import('fflate');
  let remaining = 2 * 1024 * 1024;
  const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()), {
    filter({ name, size, originalSize }) {
      const relevant = type === WORD ? name === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(name);
      if (!relevant || Math.max(size, originalSize) > remaining) return false;
      remaining -= Math.max(size, originalSize);
      return true;
    },
  });
  return Object.entries(archive)
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([name, bytes]) => {
      const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
      const namespace = type === WORD
        ? 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        : 'http://schemas.openxmlformats.org/drawingml/2006/main';
      return {
        name,
        title: type === SLIDES ? `Slide ${name.match(/(\d+)\.xml$/)[1]}` : '',
        text: [...xml.getElementsByTagNameNS(namespace, 'p')]
          .map(paragraph => [...paragraph.getElementsByTagNameNS(namespace, 't')].map(run => run.textContent).join(''))
          .join('\n'),
      };
    });
}

export default function IssueAttachmentPreview({ attachment, onClose }) {
  const [preview, setPreview] = useState(null);
  const [mediaError, setMediaError] = useState(false);
  const type = attachment.contentType || issueAttachmentType(attachment) || '';
  const image = /^image\/(jpeg|png|webp|gif)$/.test(type);
  const video = /^video\/(mp4|webm|quicktime)$/.test(type);
  const pdf = type === 'application/pdf';
  const office = type === WORD || type === SLIDES;
  const plain = type === 'text/plain';
  const canPreview = image || video || pdf || office || plain;

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    async function load() {
      try {
        let blob = attachment.file;
        if (!blob) {
          const response = await fetch(attachment.url, { signal: controller.signal });
          if (!response.ok) throw new Error('Attachment unavailable');
          blob = await response.blob();
        }
        const sections = office ? await readOfficePreview(blob, type) : null;
        const text = plain ? await blob.slice(0, 256 * 1024).text() : null;
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob.slice(0, blob.size, type || 'application/octet-stream'));
        setPreview({ url: objectUrl, sections, text });
      } catch {
        if (!controller.signal.aborted) setPreview({ error: true });
      }
    }
    if (canPreview || attachment.file) void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, canPreview, office, plain, type]);

  const downloadUrl = attachment.url || preview?.url;
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="ri-attachment-preview">
        <DialogTitle>{attachment.name}</DialogTitle>
        {downloadUrl && (
          <a className="ri-attachment-download" href={downloadUrl} download={attachment.name}
            aria-label="Download original" title="Download original">
            <Download aria-hidden="true"/>
          </a>
        )}
        <DialogDescription className="sr-only">Attachment preview and download</DialogDescription>
        {canPreview && !preview && <p role="status">Loading preview…</p>}
        {(!canPreview || preview?.error || mediaError) && <p>Preview unavailable for this file. You can download the original.</p>}
        {preview?.url && !mediaError && image && <img src={preview.url} alt={attachment.name} onError={() => setMediaError(true)} />}
        {preview?.url && !mediaError && video && <video src={preview.url} controls playsInline onError={() => setMediaError(true)} />}
        {preview?.url && pdf && <iframe src={preview.url} title={attachment.name} />}
        {preview?.sections && (
          <div className="ri-office-preview">
            <p>Text preview</p>
            {preview.sections.some(section => section.text.trim())
              ? preview.sections.map(section => <section key={section.name}>{section.title && <h3>{section.title}</h3>}<pre>{section.text}</pre></section>)
              : <p>No readable text was found in this file.</p>}
          </div>
        )}
        {preview?.text != null && <pre className="ri-office-preview">{preview.text}</pre>}
      </DialogContent>
    </Dialog>
  );
}
