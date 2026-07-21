import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Download,
  FileCheck2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
];

const atsLabels = {
  pass: 'ATS Pass',
  review: 'Review',
  needs_improvement: 'Needs Work',
};

const downloadFile = (dataUrl, fileName) => {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName || 'application-file';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [atsFilter, setAtsFilter] = useState('all');

  const load = () => {
    setLoading(true);
    base44.entities.JobApplication.list('-created_date', 200)
      .then((items) => setApplications(items || []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateApplication = async (id, payload) => {
    await base44.entities.JobApplication.update(id, payload);
    load();
  };

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesQuery = !normalizedQuery || [
        application.candidate_name,
        application.role_applied_for,
        application.email,
        application.application_number,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      const matchesAts = atsFilter === 'all' || application.ats_status === atsFilter;
      return matchesQuery && matchesAts;
    });
  }, [applications, atsFilter, query]);

  const passedCount = applications.filter((item) => Number(item.ats_score || 0) >= 95).length;
  const reviewCount = applications.filter((item) => item.status === 'reviewing' || item.status === 'new').length;
  const shortlistedCount = applications.filter((item) => item.status === 'shortlisted' || item.status === 'interview').length;

  return (
    <div>
      <PageHeader
        title="Job Applications ATS"
        description="Track career applications, score resume fit, review uploads, and manage HR follow-up."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Briefcase className="h-5 w-5 text-primary" />
          <p className="mt-2 font-heading text-2xl font-bold">{applications.length}</p>
          <p className="text-xs text-muted-foreground">Total Applications</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{passedCount}</p>
          <p className="text-xs text-muted-foreground">ATS 95% Pass</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <UserRoundCheck className="h-5 w-5 text-blue-500" />
          <p className="mt-2 font-heading text-2xl font-bold">{shortlistedCount}</p>
          <p className="text-xs text-muted-foreground">Shortlist / Interview</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidate, role, email, or application number"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <select
          value={atsFilter}
          onChange={(event) => setAtsFilter(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="all">All ATS Scores</option>
          <option value="pass">ATS Pass</option>
          <option value="review">Review Needed</option>
          <option value="needs_improvement">Needs Improvement</option>
        </select>
      </div>

      {loading ? (
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid gap-4">
          {filteredApplications.length > 0 ? filteredApplications.map((application) => {
            const score = Number(application.ats_score || 0);
            const keywords = Array.isArray(application.ats_matched_keywords) ? application.ats_matched_keywords : [];

            return (
              <article key={application.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-heading text-xl font-bold">{application.candidate_name}</h2>
                          <StatusBadge status={application.status || 'new'} />
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            {atsLabels[application.ats_status] || 'ATS Review'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">{application.role_applied_for}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {application.application_number} - Submitted {formatDate(application.created_date)}
                        </p>
                      </div>
                      <select
                        value={application.status || 'new'}
                        onChange={(event) => updateApplication(application.id, { status: event.target.value })}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                      >
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      {application.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {application.email}</p>}
                      {application.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {application.phone}</p>}
                    </div>

                    {application.candidate_summary && (
                      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm leading-6 text-foreground">
                        {application.candidate_summary}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!application.resume_file_url}
                        onClick={() => downloadFile(application.resume_file_url, application.resume_file_name)}
                      >
                        <Download className="mr-2 h-4 w-4" /> Resume
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!application.cover_letter_file_url}
                        onClick={() => downloadFile(application.cover_letter_file_url, application.cover_letter_file_name)}
                      >
                        <Download className="mr-2 h-4 w-4" /> Cover Letter
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!application.certificate_file_url}
                        onClick={() => downloadFile(application.certificate_file_url, application.certificate_file_name)}
                      >
                        <Download className="mr-2 h-4 w-4" /> Certificate
                      </Button>
                    </div>
                  </div>

                  <aside className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <FileCheck2 className="h-4 w-4 text-primary" /> ATS Score
                      </span>
                      <span className="font-heading text-2xl font-bold">{score}%</span>
                    </div>
                    <Progress value={score} className="mt-3 h-3" />
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {score >= 95 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ShieldCheck className="h-4 w-4 text-amber-500" />}
                      {score >= 95 ? 'Passed 95% ATS threshold' : 'Review before decision'}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Matched Keywords</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {keywords.length > 0 ? keywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-muted px-2 py-1 text-xs">{keyword}</span>
                        )) : <span className="text-xs text-muted-foreground">No role keywords matched.</span>}
                      </div>
                    </div>
                  </aside>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-xl border border-border bg-card py-14 text-center text-muted-foreground shadow-sm">
              No applications match this view.
            </div>
          )}
        </div>
      )}

      {!loading && reviewCount > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          {reviewCount} application{reviewCount === 1 ? '' : 's'} still need first review or follow-up.
        </p>
      )}
    </div>
  );
}
