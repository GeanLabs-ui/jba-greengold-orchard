import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Globe2,
  Zap,
  Truck,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Users,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TurnstileWidget from '@/components/TurnstileWidget';
import { whatsappSupportUrl } from '@/lib/whatsapp-support';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import './contact-reference.css';

const contactMethods = [
  {
    icon: MapPin,
    title: 'Office Location',
    value: 'Duayaw Nkwanta, Ahafo Region, Ghana',
    action: 'Get Directions',
    href: 'https://www.google.com/maps/search/?api=1&query=Duayaw%20Nkwanta%2C%20Ahafo%20Region%2C%20Ghana',
  },
  { icon: Phone, title: 'Phone', value: '+233 59 354 9954', action: 'Call Now', href: 'tel:+233593549954' },
  { icon: Mail, title: 'Email', value: 'info@jbagreengold.com', action: 'Send Email', href: 'mailto:info@jbagreengold.com' },
  { icon: Clock, title: 'Business Hours', value: 'Mon – Fri: 8:00 AM – 5:00 PM (GMT)', action: 'We’re here to help' },
];

const quickContactOptions = [
  { icon: MessageCircle, title: 'WhatsApp', copy: 'Chat with us instantly', href: whatsappSupportUrl('Hello JBA GreenGold, I would like to make an inquiry.') },
  { icon: Phone, title: 'Call Us', copy: '+233 59 354 9954', href: 'tel:+233593549954' },
  { icon: Mail, title: 'Email Us', copy: 'info@jbagreengold.com', href: 'mailto:info@jbagreengold.com' },
  { icon: MapPin, title: 'Visit Us', copy: 'Duayaw Nkwanta, Ahafo Region, Ghana', href: 'https://www.google.com/maps/search/?api=1&query=Duayaw%20Nkwanta%2C%20Ahafo%20Region%2C%20Ghana' },
];

const countryCallingCodes = [
  { iso: 'gh', name: 'Ghana', dialCode: '+233' },
  { iso: 'ng', name: 'Nigeria', dialCode: '+234' },
  { iso: 'ci', name: "Cote d'Ivoire", dialCode: '+225' },
  { iso: 'tg', name: 'Togo', dialCode: '+228' },
  { iso: 'bf', name: 'Burkina Faso', dialCode: '+226' },
  { iso: 'gb', name: 'United Kingdom', dialCode: '+44' },
  { iso: 'fr', name: 'France', dialCode: '+33' },
  { iso: 'de', name: 'Germany', dialCode: '+49' },
  { iso: 'nl', name: 'Netherlands', dialCode: '+31' },
  { iso: 'ae', name: 'United Arab Emirates', dialCode: '+971' },
  { iso: 'qa', name: 'Qatar', dialCode: '+974' },
  { iso: 'us', name: 'United States', dialCode: '+1' },
];

export default function Contact() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const topic = searchParams.get('topic');
  const initialInquiryType = topic === 'updates' ? 'general' : topic === 'export' ? 'export' : topic === 'partnership' ? 'partnership' : topic ? 'sales' : '';
  const initialSubject = topic === 'updates' ? 'Request for orchard updates' : topic === 'local-supply' ? 'Local mango supply order' : topic === 'export' ? 'Export supply quote' : topic === 'supply' ? 'Mango supply inquiry' : topic === 'partnership' ? 'Supply partnership' : '';
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [countryIso, setCountryIso] = useState('gh');
  const [form, setForm] = useState({ name: '', email: topic === 'updates' ? (location.state?.newsletterEmail || '') : '', phone: '', company: '', subject: initialSubject, message: topic === 'updates' ? 'Please send me orchard news, harvest updates and special offers. I agree to receive updates from JBA GreenGold Orchard.' : '', inquiry_type: initialInquiryType });
  const selectedCountry = countryCallingCodes.find((country) => country.iso === countryIso) || countryCallingCodes[0];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const localPhone = form.phone.trim().replace(/^0+/, '');
      await base44.entities.Inquiry.create({
        ...form,
        phone: localPhone ? `${selectedCountry.dialCode} ${localPhone}` : '',
        inquiry_type: form.inquiry_type || 'general',
        turnstile_token: turnstileToken,
      });
      toast({ title: 'Message sent!', description: 'We’ll get back to you within 24 hours.' });
      setForm({ name: '', email: '', phone: '', company: '', subject: '', message: '', inquiry_type: '' });
      setCountryIso('gh');
    } catch {
      toast({ title: 'Error', description: 'Could not send message. Please try again.', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div className="contact-reference-page">
      <section data-layout-section="hero" className="contact-reference-hero" aria-labelledby="contact-title">
        {/* Preserve the supplied campaign artwork at its original proportions. */}
        <div className="contact-hero-art" aria-hidden="true" />
        <div className="contact-hero-copy">
          <p className="contact-eyebrow">Get in touch</p>
          <h1 id="contact-title">Let’s Grow<br />Opportunities Together</h1>
          <p>Have questions about our products, export capabilities,<br className="contact-desktop-break" /> or partnership opportunities? We’d love to hear from you.<br className="contact-desktop-break" /> Our team is here to help.</p>
        </div>
        <div className="contact-hero-actions">
          <a href="#contact-message" className="contact-message-link">Send us a message <ArrowRight /></a>
          <a href="tel:+233593549954" className="contact-team-link">Speak to our team <ArrowRight /></a>
        </div>
        <div className="contact-hero-benefits">
          {[
            { icon: Zap, title: 'Quick Response', copy: 'Within 24 hours' },
            { icon: Users, title: 'Experienced Team', copy: 'Here to help' },
            { icon: Globe2, title: 'Global Partnerships', copy: 'Across markets' },
            { icon: Truck, title: 'Export Support', copy: 'From farm to market' },
          ].map(({ icon: Icon, title, copy }) => <div key={title}><Icon /><span><b>{title}</b><small>{copy}</small></span></div>)}
        </div>
      </section>

      <section data-layout-section="content" className="contact-main">
        <div className="contact-panels">
          <section id="contact-message" className="contact-panel contact-form-panel" aria-labelledby="message-title">
            <p className="text-caption font-bold uppercase tracking-[0.25em] text-[#2e7d32]">Send us a message</p>
            <h2 id="message-title" className="mt-2 text-section-title">We’d love to hear from you</h2>
            <p className="mt-1 text-body-sm text-[#5f7565]">Fill out the form below and our team will respond within 24 hours.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-label" htmlFor="name">Full Name *</Label><Input id="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="John Doe" /></div>
                <div><Label className="text-label" htmlFor="email">Email *</Label><Input id="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="john@example.com" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-label" htmlFor="phone">Phone</Label>
                  <div className="flex">
                    <Select value={countryIso} onValueChange={setCountryIso}>
                      <SelectTrigger aria-label="Country calling code" className="h-10 w-[116px] shrink-0 rounded-r-none border-r-0 px-2.5 focus:z-10">
                        <SelectValue aria-label={`${selectedCountry.name} ${selectedCountry.dialCode}`}>
                          <span className="flex items-center gap-2">
                            <img src={`/flags/${selectedCountry.iso}.png`} alt="" className="h-4 w-6 rounded-[2px] object-cover ring-1 ring-black/10" />
                            <span className="text-body-sm">{selectedCountry.dialCode}</span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {countryCallingCodes.map((country) => (
                          <SelectItem key={country.iso} value={country.iso}>
                            <span className="flex min-w-[220px] items-center gap-3">
                              <img src={`/flags/${country.iso}.png`} alt="" className="h-4 w-6 rounded-[2px] object-cover ring-1 ring-black/10" />
                              <span className="flex-1 text-left">{country.name}</span>
                              <span className="text-muted-foreground">{country.dialCode}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="20 123 4567" className="rounded-l-none" />
                  </div>
                </div>
                <div><Label className="text-label" htmlFor="company">Company</Label><Input id="company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name (optional)" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-label" htmlFor="type">Inquiry Type</Label>
                  <Select value={form.inquiry_type} onValueChange={(value) => setForm({ ...form, inquiry_type: value })}>
                    <SelectTrigger id="type"><SelectValue placeholder="Select an inquiry type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem><SelectItem value="sales">Local Supply</SelectItem><SelectItem value="export">Export Supply</SelectItem><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="careers">Careers</SelectItem><SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-label" htmlFor="subject">Subject *</Label><Input id="subject" required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Mango supply inquiry" /></div>
              </div>
              <div>
                <Label className="text-label" htmlFor="message">Message *</Label>
                <Textarea id="message" required rows={5} maxLength={1000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us more about your inquiry..." className="min-h-[125px] resize-none" />
                <p className="mt-1 text-right text-caption text-[#5f7565]">{form.message.length}/1000</p>
              </div>
              <TurnstileWidget onToken={setTurnstileToken} />
              <Button type="submit" disabled={submitting || !turnstileToken} className="h-10 w-full rounded bg-[#2e7d32] text-white hover:bg-[#c8e6c9] hover:text-[#123524]">
                {submitting ? 'Sending...' : 'Send Message'} <Send className="ml-2 h-4 w-4" />
              </Button>
              <p className="flex items-center justify-center gap-2 text-caption text-[#5f7565]"><LockKeyhole className="h-3 w-3 text-[#123524]" /> Your information is safe with us. We never share your details with third parties.</p>
            </form>
          </section>

          <section className="contact-panel contact-info-panel" aria-labelledby="contact-information-title">
            <p className="text-caption font-bold uppercase tracking-[0.25em] text-[#2e7d32]">Our contact information</p>
            <h2 id="contact-information-title" className="mt-2 text-section-title">Reach us directly</h2>
            <p className="mt-1 text-body-sm text-[#5f7565]">You can also get in touch with us through any of these channels.</p>
            <div className="mt-4 space-y-3">
              {contactMethods.map((method) => (
                <div key={method.title} className="contact-method">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#2e7d32] text-white"><method.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><p className="text-body-sm font-bold">{method.title}</p><p className="text-caption text-[#5f7565]">{method.value}</p></div>
                  {method.href ? <a href={method.href} target={method.href.startsWith('http') ? '_blank' : undefined} rel={method.href.startsWith('http') ? 'noreferrer' : undefined} className="inline-flex items-center gap-2 text-caption font-bold text-[#256b2a] hover:text-[#43a047]">{method.action} <ArrowRight className="h-3.5 w-3.5" /></a> : <span className="text-caption font-bold text-[#256b2a]">{method.action}</span>}
                </div>
              ))}
            </div>
            <div className="contact-map">
              <iframe title="Map of Duayaw Nkwanta, Ahafo Region, Ghana" width="100%" height="100%" loading="lazy" src="https://maps.google.com/maps?q=Duayaw%20Nkwanta%2C%20Ahafo%20Region%2C%20Ghana&z=11&output=embed" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </section>
        </div>
      </section>

      <section data-layout-section="content" className="contact-quick" aria-labelledby="quick-contact-title">
        <div className="contact-quick-inner">
          <div><p className="text-caption font-bold uppercase tracking-[0.25em] text-[#2e7d32]">Other ways to connect</p><h2 id="quick-contact-title" className="mt-2 text-section-title">Quick Contact Options</h2><p className="mt-1 text-caption text-[#5f7565]">Choose the option that works best for you.</p></div>
          <div className="contact-quick-grid">
            {quickContactOptions.map((option) => (
              <a key={option.title} href={option.href} target={option.href.startsWith('http') ? '_blank' : undefined} rel={option.href.startsWith('http') ? 'noreferrer' : undefined} className="contact-quick-card">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8f5e9] text-[#2e7d32]"><option.icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-caption">{option.title}</b><span className="block text-caption text-[#5f7565]">{option.copy}</span></span><ArrowRight className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
