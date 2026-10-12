import { describe, expect, it } from 'vitest';
import { issueReportStamp, latestIssuesFirst } from './issue-report-time';

describe('issue reporting timestamps', () => {
  it('sorts by reported date and time rather than due date or edit date', () => {
    const rows = [
      { id:'ISS-1', report_date:'2026-10-09', report_time:'08:00', due:'2027-01-01', updated_date:'2027-02-01' },
      { id:'ISS-2', report_date:'2026-10-09', report_time:'10:00', due:'2026-10-10' },
      { id:'ISS-3', created_date:'2026-10-08T23:00:00Z' },
      { id:'ISS-4' },
    ];
    expect(rows.sort(latestIssuesFirst).map(row=>row.id)).toEqual(['ISS-2','ISS-1','ISS-3','ISS-4']);
  });
  it('shows only the reporting date in Accra and handles missing timestamps', () => {
    expect(issueReportStamp({})).toBe('Not recorded');
    expect(issueReportStamp({report_date:'2026-10-09',report_time:'14:30'})).toBe('09 Oct 2026');
    expect(issueReportStamp({created_date:'2026-10-09T14:30:00Z'})).toBe('09 Oct 2026');
    expect(issueReportStamp({report_date:'2026-10-09'})).not.toContain('00:00');
  });
});
