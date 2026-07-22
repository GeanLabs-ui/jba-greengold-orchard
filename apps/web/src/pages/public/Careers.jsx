import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Globe2,
  HandHeart,
  Leaf,
  MapPin,
  ShieldCheck,
  Sprout,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import TurnstileWidget from '@/components/TurnstileWidget';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const benefits = [
  { icon: Sprout, title: 'Make an Impact', desc: 'Be part of a mission that supports farmers, delivers quality, and feeds the world.' },
  { icon: Users, title: 'Grow With Us', desc: 'We invest in your growth through training, mentorship, and career advancement.' },
  { icon: Globe2, title: 'Sustainable Future', desc: 'Work in an environment that values sustainability and protects our planet.' },
  { icon: ShieldCheck, title: 'Great Culture', desc: 'Join a diverse, inclusive, and supportive team that celebrates you.' },
  { icon: HandHeart, title: 'Competitive Benefits', desc: 'Enjoy attractive benefits that support your wellbeing and work-life balance.' },
];

const openRoles = [
  {
    title: 'Farm Operations Manager',
    dept: 'Operations',
    location: 'Techiman, Ghana',
    type: 'Full-time',
    icon: Users,
    keywords: ['farm', 'operations', 'harvest', 'team leadership', 'agriculture', 'compliance'],
  },
  {
    title: 'Quality Assurance Officer',
    dept: 'Quality Control',
    location: 'Accra, Ghana',
    type: 'Full-time',
    icon: ShieldCheck,
    keywords: ['quality assurance', 'food safety', 'haccp', 'inspection', 'audit', 'compliance'],
  },
  {
    title: 'Sales & Marketing Executive',
    dept: 'Sales & Marketing',
    location: 'Accra, Ghana',
    type: 'Full-time',
    icon: HandHeart,
    keywords: ['sales', 'marketing', 'customer', 'pipeline', 'crm', 'export'],
  },
  {
    title: 'Supply Chain Coordinator',
    dept: 'Supply Chain',
    location: 'Accra, Ghana',
    type: 'Full-time',
    icon: Globe2,
    keywords: ['supply chain', 'logistics', 'inventory', 'delivery', 'procurement', 'planning'],
  },
  {
    title: 'Finance Officer',
    dept: 'Finance',
    location: 'Accra, Ghana',
    type: 'Full-time',
    icon: Briefcase,
    keywords: ['finance', 'accounting', 'budget', 'invoice', 'payroll', 'reporting'],
  },
];

const initialForm = {
  candidateName: '',
  email: '',
  phone: '',
  roleAppliedFor: openRoles[0].title,
  summary: '',
  resume: null,
  coverLetter: null,
  certificate: null,
};

const normalizeText = (value) => String(value || '').toLowerCase();

const calculateAtsScore = ({ roleAppliedFor, summary, resume, coverLetter, certificate }) => {
  const role = openRoles.find((item) => item.title === roleAppliedFor) || openRoles[0];
  const searchableText = normalizeText(`${summary} ${resume?.name || ''} ${coverLetter?.name || ''} ${certificate?.name || ''}`);
  const matchedKeywords = role.keywords.filter((keyword) => searchableText.includes(keyword));
  const keywordScore = Math.round((matchedKeywords.length / role.keywords.length) * 45);
  const documentScore = (resume ? 20 : 0) + (coverLetter ? 15 : 0) + (certificate ? 5 : 0);
  const detailScore = Math.min(15, Math.floor(normalizeText(summary).split(/\s+/).filter(Boolean).length / 8) * 3);
  const total = Math.min(100, keywordScore + documentScore + detailScore + 15);

  return {
    score: total,
    matchedKeywords,
    status: total >= 95 ? 'pass' : total >= 75 ? 'review' : 'needs_improvement',
  };
};

const ApplicationFileInput = ({ id, label, required, file, onChange }) => (
  <label htmlFor={id} className="block rounded-lg border border-amber-100 bg-white p-4 shadow-sm">
    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
      <Upload className="h-4 w-4 text-emerald-800" />
      {label}
      {required && <span className="text-amber-700">*</span>}
    </span>
    <span className="mt-1 block text-xs text-foreground">PDF, DOC, DOCX, or TXT. Max 2MB.</span>
    <input
      id={id}
      type="file"
      required={required}
      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
      onChange={(event) => onChange(event.target.files?.[0] || null)}
      className="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-800"
    />
    {file && <span className="mt-2 block truncate text-xs font-medium text-emerald-800">{file.name}</span>}
  </label>
);

export default function Careers() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const atsPreview = useMemo(() => calculateAtsScore(form), [form]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      for (const file of [form.resume, form.coverLetter, form.certificate].filter(Boolean)) {
        if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} is larger than 2MB.`);
      }
      const ats = calculateAtsScore(form);
      const payload = new FormData();
      payload.set('candidateName', form.candidateName.trim());
      payload.set('email', form.email.trim());
      payload.set('phone', form.phone.trim());
      payload.set('roleAppliedFor', form.roleAppliedFor);
      payload.set('summary', form.summary.trim());
      payload.set('turnstileToken', turnstileToken);
      if (form.resume) payload.set('resume', form.resume);
      if (form.coverLetter) payload.set('coverLetter', form.coverLetter);
      if (form.certificate) payload.set('certificate', form.certificate);
      await base44.applications.submit(payload);

      setForm(initialForm);
      setMessage(`Application submitted. ATS tracking score: ${ats.score}%.`);
    } catch (error) {
      setMessage(error.message || 'Application could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fffaf2] text-emerald-950">
      <section className="relative overflow-hidden bg-[#fffdf7] pb-8 pt-10 lg:pb-10 lg:pt-12">
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full border border-amber-200/40 opacity-35" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.84fr_1.16fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Leaf className="h-4 w-4 text-emerald-800" /> Careers at JBA GreenGold Orchard
            </div>
            <h1 className="mt-7 font-heading text-5xl font-bold leading-[0.98] tracking-tight sm:text-6xl">
              Grow Your Career. <br />
              Grow the <span className="text-amber-600">Future.</span>
            </h1>
            <div className="mt-7 h-0.5 w-16 bg-amber-500" />
            <p className="mt-7 max-w-xl text-lg leading-8 text-foreground">
              Apply for current roles and send your resume, cover letter, and supporting certificates directly to our HR review system.
            </p>
            <Button className="mt-8 h-12 rounded-lg bg-emerald-900 px-7 text-white shadow-lg hover:bg-emerald-800" asChild>
              <a href="#application-form">
                <FileCheck2 className="mr-2 h-4 w-4 text-amber-300" /> Apply Now
              </a>
            </Button>
          </div>

          <div className="relative">
            <img
              src="/pages/careers-hero-team.webp"
              alt="JBA GreenGold team reviewing mango orchard work"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf0] py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-600">
            <Leaf className="h-4 w-4 text-emerald-800" /> Why build your career with us?
          </div>
          <h2 className="mt-3 font-heading text-4xl font-bold tracking-tight">More Than a Job. A Purpose.</h2>
          <div className="mx-auto mt-4 h-0.5 w-14 bg-amber-500" />
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {benefits.map((item) => (
              <div key={item.title} className="min-h-[205px] rounded-lg border border-amber-100 bg-white p-6 shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-500 bg-white">
                  <item.icon className="h-8 w-8 text-emerald-800" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="openings" className="bg-[#fffaf0] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-wide text-amber-600">Current Openings</div>
            <h2 className="mt-2 font-heading text-4xl font-bold tracking-tight">Find Your Next Opportunity</h2>
            <div className="mx-auto mt-4 h-0.5 w-14 bg-amber-500" />
          </div>

          <div className="mt-7 overflow-hidden rounded-lg">
            {openRoles.map((role) => (
              <div key={role.title} className="grid gap-3 border-b border-amber-100 bg-white px-7 py-3.5 last:border-b-0 md:grid-cols-[1.35fr_0.9fr_1.08fr_0.8fr_auto] md:items-center">
                <h3 className="font-heading text-lg font-bold">{role.title}</h3>
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <role.icon className="h-4 w-4 text-emerald-800" /> {role.dept}
                </span>
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-emerald-800" /> {role.location}
                </span>
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Briefcase className="h-4 w-4 text-emerald-800" /> {role.type}
                </span>
                <Button
                  size="sm"
                  className="h-9 rounded-md bg-emerald-900 px-5 text-white hover:bg-emerald-800"
                  onClick={() => {
                    updateField('roleAppliedFor', role.title);
                    document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Apply <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="application-form" className="bg-[#fffaf0] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.45fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-900 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-600">Job Application</p>
                <h2 className="font-heading text-3xl font-bold tracking-tight">Submit your application</h2>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Full Name *
                <input
                  required
                  value={form.candidateName}
                  onChange={(event) => updateField('candidateName', event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-amber-100 px-3 outline-none focus:border-emerald-800"
                />
              </label>
              <label className="block text-sm font-semibold">
                Role Applying For *
                <select
                  required
                  value={form.roleAppliedFor}
                  onChange={(event) => updateField('roleAppliedFor', event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-amber-100 bg-white px-3 outline-none focus:border-emerald-800"
                >
                  {openRoles.map((role) => <option key={role.title} value={role.title}>{role.title}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Email *
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-amber-100 px-3 outline-none focus:border-emerald-800"
                />
              </label>
              <label className="block text-sm font-semibold">
                Phone
                <input
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-amber-100 px-3 outline-none focus:border-emerald-800"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold">
              Skills and Experience Summary
              <textarea
                rows={5}
                value={form.summary}
                onChange={(event) => updateField('summary', event.target.value)}
                placeholder="Add role keywords, certifications, tools, experience, and achievements so HR can review your fit."
                className="mt-2 w-full rounded-md border border-amber-100 px-3 py-3 outline-none focus:border-emerald-800"
              />
            </label>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <ApplicationFileInput id="resume" label="CV / Resume" required file={form.resume} onChange={(file) => updateField('resume', file)} />
              <ApplicationFileInput id="coverLetter" label="Cover Letter" required file={form.coverLetter} onChange={(file) => updateField('coverLetter', file)} />
              <ApplicationFileInput id="certificate" label="Certificate" file={form.certificate} onChange={(file) => updateField('certificate', file)} />
            </div>

            {message && (
              <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                {message}
              </div>
            )}

            <TurnstileWidget onToken={setTurnstileToken} />
            <Button disabled={submitting || !turnstileToken} className="mt-6 h-12 rounded-lg bg-emerald-900 px-8 text-white hover:bg-emerald-800">
              {submitting ? 'Submitting...' : 'Submit Application'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <aside className="rounded-lg border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-600">
              <FileCheck2 className="h-4 w-4 text-emerald-800" /> ATS Tracking
            </div>
            <p className="mt-3 font-heading text-4xl font-bold">{atsPreview.score}%</p>
            <Progress value={atsPreview.score} className="mt-3 h-3 bg-amber-100" />
            <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              <p className="font-semibold">Target pass score: 95%</p>
              <p className="mt-1">Applications are sent to the admin ATS review page with score, documents, keywords, and follow-up status.</p>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Required resume upload</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Required cover letter upload</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-700" /> Optional certificates improve review quality</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-[#fffaf0] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-lg shadow-xl">
          <img
            src="/pages/careers-cta-banner.webp"
            alt="Ready to grow with JBA GreenGold Orchard"
            className="h-auto w-full object-contain"
          />
        </div>
      </section>
    </div>
  );
}
