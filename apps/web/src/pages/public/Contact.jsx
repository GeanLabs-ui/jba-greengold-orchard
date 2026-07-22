import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import TurnstileWidget from '@/components/TurnstileWidget';
import { Send, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function Contact() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', subject: '', message: '', inquiry_type: 'general' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Inquiry.create({ ...form, turnstile_token: turnstileToken });
      toast({ title: 'Message sent!', description: 'We\'ll get back to you within 24 hours.' });
      setForm({ name: '', email: '', phone: '', company: '', subject: '', message: '', inquiry_type: 'general' });
    } catch {
      toast({ title: 'Error', description: 'Could not send message. Please try again.', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-900 to-emerald-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Get in Touch</h1>
          <p className="mt-2 text-emerald-100">Have questions about our products, export capabilities, or partnerships? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-2xl font-bold">Send Us a Message</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fill out the form and our team will respond within 24 hours.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+256 700 000 000" />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="type">Inquiry Type</Label>
                    <Select value={form.inquiry_type} onValueChange={(v) => setForm({ ...form, inquiry_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="careers">Careers</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." />
                </div>
                <TurnstileWidget onToken={setTurnstileToken} />
                <Button type="submit" disabled={submitting || !turnstileToken} className="w-full gradient-mango text-white">
                  {submitting ? 'Sending...' : 'Send Message'} <Send className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-bold">Contact Information</h2>
              <p className="mt-1 text-sm text-muted-foreground">Reach us directly through any of these channels.</p>
              <div className="mt-6 space-y-4">
                {[
                  { icon: MapPin, title: 'Office Location', value: 'Plot 123, Industrial Area, Accra, Ghana' },
                  { icon: Phone, title: 'Phone', value: '+1 (202) 509-4965' },
                  { icon: Mail, title: 'Email', value: 'info@jbagreengold.com' },
                  { icon: Clock, title: 'Business Hours', value: 'Mon–Fri: 8:00 AM – 5:00 PM' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                <iframe
                  title="Office Location"
                  width="100%"
                  height="280"
                  loading="lazy"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=32.5%2C0.25%2C32.65%2C0.35&layer=mapnik"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
