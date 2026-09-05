import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const countries = [['GH', 'Ghana'], ['NG', 'Nigeria'], ['TG', 'Togo'], ['BF', 'Burkina Faso'], ['CI', "Côte d’Ivoire"], ['BJ', 'Benin'], ['SN', 'Senegal'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['US', 'United States'], ['GB', 'United Kingdom']];
// Intl supplies the remaining countries without maintaining a partial world list.
const regions = new Intl.DisplayNames(['en'], { type: 'region' });
const additional = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BG BH BI BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GD GE GF GG GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SO SR SS ST SV SX SY SZ TC TD TF TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM UY UZ VA VC VE VG VI VN VU WF WS YE YT ZM ZW'.split(' ').map((code) => [code, regions.of(code)]).sort((a, b) => a[1].localeCompare(b[1]));
const placeholders = [
  ['paystack:card', 'Card · Paystack', 'Visa and Mastercard'],
  ['paystack:mobile_money', 'Mobile money', 'MTN MoMo, Telecel Cash and supported local wallets'],
  ['paystack:bank_payment', 'Pay by bank', 'Bank transfer through Paystack'],
  ['stripe:card', 'Card · Stripe', 'Visa and Mastercard'],
  ['stripe:digital_wallet', 'Apple Pay / Google Pay', 'Available on supported devices; card fallback'],
].map(([id, label, detail]) => ({ id, label, detail, available: false, reason: 'Coming soon' }));

export default function PaymentOptions({ country, setCountry, value, onChange, disabled = false }) {
  const [options, setOptions] = useState(placeholders);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    base44.commerce.paymentOptions(country).then((data) => {
      if (!active) return;
      setOptions(data.options);
      if (value.includes(':') && !data.options.some((option) => option.id === value && option.available)) onChange('mobile_money_on_confirmation');
    }).catch(() => { if (active) { setOptions(placeholders); setError('Online payment availability could not be loaded. Please try again later.'); onChange('mobile_money_on_confirmation'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Selection is validated when the country changes; it does not refetch on selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);
  return <>
    <label className="checkout-field checkout-payment-country">Payment country
      <select value={country} disabled={disabled} onChange={(event) => { onChange('mobile_money_on_confirmation'); setCountry(event.target.value); }}>
        {[...countries, ...additional].map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
    <p className="checkout-payment-help">Charged in GHS (₵). Your bank may convert the amount. Wallet and bank options depend on country and provider.</p>
    {error && <p role="status" className="checkout-payment-help">{error}</p>}
    <fieldset disabled={disabled || loading} aria-busy={loading}>
      <legend className="sr-only">Online payment methods</legend>
      {options.map((option) => <label className="checkout-payment-option" key={option.id} data-selected={value === option.id} data-unavailable={!option.available}>
        <input type="radio" name="payment_method" value={option.id} checked={value === option.id} disabled={!option.available} onChange={() => onChange(option.id)} />
        <span><strong>{option.label}</strong><small>{option.detail}</small>{!option.available && <em>{option.reason}</em>}</span>
      </label>)}
    </fieldset>
  </>;
}
