export const WHATSAPP_SUPPORT_PHONE = (import.meta.env.VITE_WHATSAPP_SUPPORT_PHONE || '233593549954').replace(/\D/g, '');

export function whatsappSupportUrl(message = 'Hello JBA GreenGold support, I would like some help.') {
  return `https://wa.me/${WHATSAPP_SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
}
