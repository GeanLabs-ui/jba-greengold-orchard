import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Globe2,
  Leaf,
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

const contactMethods = [
  {
    icon: MapPin,
    title: 'Office Location',
    value: 'Plot 123, Industrial Area, Accra, Ghana',
    action: 'Get Directions',
    href: 'https://www.openstreetmap.org/?mlat=5.6037&mlon=-0.1870#map=13/5.6037/-0.1870',
  },
  { icon: Phone, title: 'Phone', value: '+233 59 354 9954', action: 'Call Now', href: 'tel:+233593549954' },
  { icon: Mail, title: 'Email', value: 'info@jbagreengold.com', action: 'Send Email', href: 'mailto:info@jbagreengold.com' },
  { icon: Clock, title: 'Business Hours', value: 'Mon – Fri: 8:00 AM – 5:00 PM (GMT)', action: 'We’re here to help' },
];

const quickContactOptions = [
  { icon: MessageCircle, title: 'WhatsApp', copy: 'Chat with us instantly', href: whatsappSupportUrl('Hello JBA GreenGold, I would like to make an inquiry.') },
  { icon: Phone, title: 'Call Us', copy: '+233 59 354 9954', href: 'tel:+233593549954' },
  { icon: Mail, title: 'Email Us', copy: 'info@jbagreengold.com', href: 'mailto:info@jbagreengold.com' },
  { icon: MapPin, title: 'Visit Us', copy: 'Accra, Ghana', href: 'https://www.openstreetmap.org/?mlat=5.6037&mlon=-0.1870#map=13/5.6037/-0.1870' },
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
  const topic = searchParams.get('topic');
  const initialInquiryType = topic === 'export' ? 'export' : topic === 'partnership' ? 'partnership' : topic ? 'sales' : '';
  const initialSubject = topic === 'local-supply' ? 'Local mango supply order' : topic === 'export' ? 'Export supply quote' : topic === 'supply' ? 'Mango supply inquiry' : topic === 'partnership' ? 'Supply partnership' : '';
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [countryIso, setCountryIso] = useState('gh');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', subject: initialSubject, message: '', inquiry_type: initialInquiryType });
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
    <div className="overflow-hidden bg-white text-[#173d24]">
      <section className="relative min-h-[390px] overflow-hidden bg-[#052f26]" aria-labelledby="contact-title">
        <img src="/pages/contact/hero.webp" alt="A JBA GreenGold team member assisting a customer by phone" className="absolute inset-0 h-full w-full object-contain object-bottom lg:object-right" />
        <div className="absolute inset-0 bg-[#052f26]/45 lg:hidden" />
        <div className="relative mx-auto flex min-h-[390px] max-w-7xl items-center px-5 py-8 sm:px-8 lg:px-16">
          <div className="max-w-[500px] text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em]">Get in touch</p>
            <h1 id="contact-title" className="mt-3 font-heading text-[42px] font-black leading-[0.98] tracking-[-0.035em] sm:text-[48px]">
              Let’s Grow<br />Opportunities <span className="text-[#9ACD32]">Together</span>
            </h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-6 text-white/92">
              Have questions about our products, export capabilities, or partnership opportunities? We’d love to hear from you. Our team is here to help.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-[12px]">
              <span className="inline-flex items-center gap-2"><Leaf className="h-8 w-8 rounded-full bg-[#2E7D32] p-2" /><b>Quick Response</b><span className="text-white/75">Within 24 hours</span></span>
              <span className="inline-flex items-center gap-2"><Users className="h-8 w-8 rounded-full bg-[#2E7D32] p-2" /><b>Experienced Team</b></span>
              <span className="inline-flex items-center gap-2"><Globe2 className="h-8 w-8 rounded-full bg-[#2E7D32] p-2" /><b>Global Partnerships</b></span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fcfdfc] py-6 sm:py-8">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-2 lg:px-14">
          <section className="rounded-md border border-[#dde5df] bg-white p-5 sm:p-6" aria-labelledby="message-title">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#2E7D32]">Send us a message</p>
            <h2 id="message-title" className="mt-2 font-heading text-[23px] font-black tracking-[-0.02em]">We’d love to hear from you</h2>
            <p className="mt-1 text-[13px] text-[#6a766f]">Fill out the form below and our team will respond within 24 hours.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="name">Full Name *</Label><Input id="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="John Doe" /></div>
                <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="john@example.com" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="flex">
                    <Select value={countryIso} onValueChange={setCountryIso}>
                      <SelectTrigger aria-label="Country calling code" className="h-10 w-[116px] shrink-0 rounded-r-none border-r-0 px-2.5 focus:z-10">
                        <SelectValue aria-label={`${selectedCountry.name} ${selectedCountry.dialCode}`}>
                          <span className="flex items-center gap-2">
                            <img src={`/flags/${selectedCountry.iso}.png`} alt="" className="h-4 w-6 rounded-[2px] object-cover ring-1 ring-black/10" />
                            <span className="text-[13px]">{selectedCountry.dialCode}</span>
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
                <div><Label htmlFor="company">Company</Label><Input id="company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name (optional)" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="type">Inquiry Type</Label>
                  <Select value={form.inquiry_type} onValueChange={(value) => setForm({ ...form, inquiry_type: value })}>
                    <SelectTrigger id="type"><SelectValue placeholder="Select an inquiry type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem><SelectItem value="sales">Local Supply</SelectItem><SelectItem value="export">Export Supply</SelectItem><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="careers">Careers</SelectItem><SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="subject">Subject *</Label><Input id="subject" required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Mango supply inquiry" /></div>
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" required rows={5} maxLength={1000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us more about your inquiry..." className="min-h-[125px] resize-none" />
                <p className="mt-1 text-right text-[10px] text-[#7b857f]">{form.message.length}/1000</p>
              </div>
              <TurnstileWidget onToken={setTurnstileToken} />
              <Button type="submit" disabled={submitting || !turnstileToken} className="h-10 w-full rounded bg-[#2E7D32] text-white hover:bg-[#9ACD32] hover:text-[#173d24]">
                {submitting ? 'Sending...' : 'Send Message'} <Send className="ml-2 h-4 w-4" />
              </Button>
              <p className="flex items-center justify-center gap-2 text-[10px] text-[#77817a]"><LockKeyhole className="h-3 w-3 text-[#173d24]" /> Your information is safe with us. We never share your details with third parties.</p>
            </form>
          </section>

          <section className="rounded-md border border-[#dde5df] bg-white p-5 sm:p-6" aria-labelledby="contact-information-title">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#2E7D32]">Our contact information</p>
            <h2 id="contact-information-title" className="mt-2 font-heading text-[23px] font-black tracking-[-0.02em]">Reach us directly</h2>
            <p className="mt-1 text-[13px] text-[#6a766f]">You can also get in touch with us through any of these channels.</p>
            <div className="mt-4 space-y-3">
              {contactMethods.map((method) => (
                <div key={method.title} className="flex min-h-[58px] items-center gap-4 rounded-md bg-[#f0f6f0] px-4 py-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#2E7D32] text-white"><method.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-bold">{method.title}</p><p className="truncate text-[12px] text-[#657168]">{method.value}</p></div>
                  {method.href ? <a href={method.href} target={method.href.startsWith('http') ? '_blank' : undefined} rel={method.href.startsWith('http') ? 'noreferrer' : undefined} className="inline-flex items-center gap-2 text-[11px] font-bold text-[#236a31] hover:text-[#5f8f20]">{method.action} <ArrowRight className="h-3.5 w-3.5" /></a> : <span className="text-[11px] font-bold text-[#236a31]">{method.action}</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 h-[205px] overflow-hidden rounded-md border border-[#dce4dd]">
              <iframe title="JBA GreenGold office location in Accra" width="100%" height="100%" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=-0.31%2C5.50%2C-0.07%2C5.70&amp;layer=mapnik&amp;marker=5.6037%2C-0.1870" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
            </div>
          </section>
        </div>
      </section>

      <section className="border-y border-[#dfe9df] bg-[#f1f8f1] py-6" aria-labelledby="quick-contact-title">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-[260px_1fr] lg:px-14">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#2E7D32]">Other ways to connect</p><h2 id="quick-contact-title" className="mt-2 font-heading text-[22px] font-black">Quick Contact Options</h2><p className="mt-1 text-[12px] text-[#6a766f]">Choose the option that works best for you.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickContactOptions.map((option) => (
              <a key={option.title} href={option.href} target={option.href.startsWith('http') ? '_blank' : undefined} rel={option.href.startsWith('http') ? 'noreferrer' : undefined} className="flex items-center gap-3 rounded-md border border-[#dde5df] bg-white p-3 text-[#173d24] transition hover:border-[#9ACD32] hover:bg-[#f8fced]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dcf1d0] text-[#248238]"><option.icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-[12px]">{option.title}</b><span className="block truncate text-[10px] text-[#758078]">{option.copy}</span></span><ArrowRight className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
