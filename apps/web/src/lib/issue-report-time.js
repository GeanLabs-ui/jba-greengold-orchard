export function issueReportTime(issue) {
  const reported = issue.report_date
    ? Date.parse(`${issue.report_date}T${issue.report_time || '00:00'}Z`)
    : Date.parse(issue.created_date || '');
  return Number.isFinite(reported) ? reported : 0;
}

export function latestIssuesFirst(left, right) {
  return issueReportTime(right) - issueReportTime(left)
    || String(right.id).localeCompare(String(left.id), undefined, { numeric: true });
}

export function issueReportStamp(issue) {
  const time = issueReportTime(issue);
  if (!time) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra', day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(time));
}
