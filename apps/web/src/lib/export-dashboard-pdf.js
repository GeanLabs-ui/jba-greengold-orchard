const asDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export async function exportDashboardPdf(element, filename) {
  if (!element) throw new Error('Dashboard is unavailable.');
  const root = element.closest('.admin-shell') || element;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll('img')].map((image) => image.decode()));
  // SVGs are rendered as standalone images by html2canvas. Embed their photos
  // so the chart matches the visible dashboard.
  const photos = [...root.querySelectorAll('img')];
  const embeddedPhotos = await Promise.all(photos.map(async (photo) => { const response = await fetch(photo.currentSrc || photo.src); if (!response.ok) throw new Error('A report image could not be loaded.'); return asDataUrl(await response.blob()); }));
  const svgImages = [...root.querySelectorAll('svg image')];
  const embeddedImages = await Promise.all(svgImages.map(async (image) => {
    const response = await fetch(image.getAttribute('href'));
    if (!response.ok) throw new Error('A chart image could not be loaded.');
    return asDataUrl(await response.blob());
  }));
  const width = Math.ceil(root.getBoundingClientRect().width);
  const main = root.querySelector('.admin-scroll-content');
  const height = Math.ceil((main ? root.getBoundingClientRect().height - main.getBoundingClientRect().height + main.scrollHeight : element.scrollHeight));
  const canvas = await html2canvas(root, {
    scale: 2, width, height, backgroundColor: '#d6ecfa', useCORS: true, foreignObjectRendering: true,
    onclone: (clonedDocument, clone) => {
      clonedDocument.body.appendChild(clone);
      Object.assign(clone.style, { position: 'absolute', left: '0', top: '0', margin: '0', width: `${width}px`, height: `${height}px`, overflow: 'visible' });
      const scroll = clone.querySelector('.admin-scroll-content');
      if (scroll) {
        scroll.scrollTop = 0;
        Object.assign(scroll.style, { overflow: 'visible', height: `${main.scrollHeight}px`, maxHeight: 'none', flex: 'none' });
        let ancestor = scroll.parentElement;
        while (ancestor && ancestor !== clone) { Object.assign(ancestor.style, { overflow: 'visible', height: 'auto', maxHeight: 'none', flex: 'none' }); ancestor = ancestor.parentElement; }
      }
      clone.querySelectorAll('.orchard-panel-heading h2, .orchard-farm h2, .orchard-farm h2 a').forEach((node) => { node.style.width = 'auto'; node.style.whiteSpace = 'nowrap'; node.style.flexShrink = '0'; });
      clone.querySelectorAll('.orchard-table-scroll').forEach((node) => { node.style.overflow = 'visible'; node.style.maxHeight = 'none'; });
      clone.querySelectorAll('img').forEach((photo, index) => { photo.removeAttribute('srcset'); photo.src = embeddedPhotos[index]; });
      clone.querySelectorAll('svg image').forEach((image, index) => image.setAttribute('href', embeddedImages[index]));
    },
  });
  const pageWidth = 297;
  const pageHeight = pageWidth * canvas.height / canvas.width;
  const doc = new jsPDF({ orientation: pageWidth > pageHeight ? 'landscape' : 'portrait', unit: 'mm', format: [pageWidth, pageHeight], compress: true });
  doc.setProperties({ title: 'Orchard Dashboard Report', subject: 'Dashboard layout and current visual data' });
  doc.addImage(canvas, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  doc.save(filename);
}
