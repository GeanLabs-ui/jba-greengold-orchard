export function basketPage(lines, requestedPage, requestedSize) {
  const size = Math.max(1, Math.floor(requestedSize) || 1);
  const pageCount = Math.max(1, Math.ceil(lines.length / size));
  const page = Math.min(pageCount - 1, Math.max(0, Math.floor(requestedPage) || 0));
  const start = page * size;
  const end = Math.min(lines.length, start + size);
  return { page, pageCount, start, end, items: lines.slice(start, end) };
}
