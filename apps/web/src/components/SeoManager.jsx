import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://jbagreengoldorchard.farm';
const pages = {
  '/': ['JBA GreenGold Orchard', 'Premium mango production, local supply, and export from Ghana.'],
  '/about': ['About JBA GreenGold Orchard', 'Learn about our orchard, people, and responsible mango production.'],
  '/products': ['Mango Products', 'Explore fresh and processed mango products from JBA GreenGold Orchard.'],
  '/cart': ['Your Basket', 'Review products selected from JBA GreenGold Orchard.'],
  '/checkout': ['Secure Checkout', 'Confirm delivery details for your JBA GreenGold Orchard order.'],
  '/my-orders': ['Track My Orders', 'Follow the fulfillment and delivery progress of your orders.'],
  '/farms': ['Our Mango Farms', 'Discover our managed mango farms and production capabilities.'],
  '/sustainability': ['Sustainable Mango Farming', 'Our approach to responsible farming, people, and the environment.'],
  '/supply': ['Mango Supply', 'Choose reliable local mango delivery in Ghana or compliant export supply for international markets.'],
  '/export': ['Mango Export Services', 'Export-ready Ghanaian mango products, quality controls, and logistics.'],
  '/local-supply': ['Local Mango Supply', 'Reliable mango supply for retailers, wholesalers, and food businesses.'],
  '/news': ['Orchard News', 'Updates from JBA GreenGold Orchard farms and operations.'],
  '/careers': ['Careers', 'Join the team growing Ghana’s mango value chain.'],
  '/contact': ['Contact JBA GreenGold Orchard', 'Contact our team about mango supply, exports, farms, and careers.'],
};

export default function SeoManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isPrivate = /^\/(admin|portal|checkout|my-orders|login|register|forgot-password|reset-password)/.test(pathname);
    const isDeliveryLogistics = pathname === '/supply';
    const [title, description] = isDeliveryLogistics
      ? ['Delivery & Logistics | JBA GreenGold Orchard', 'Reliable local delivery, export logistics, cold-chain transport, warehousing, and traceable mango shipments.']
      : pages[pathname] || ['JBA GreenGold Orchard', 'Premium mango production, local supply, and export from Ghana.'];
    document.title = title;
    const setMeta = (selector, attribute, value) => {
      const element = document.querySelector(selector);
      if (element) element.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', `${SITE_URL}${pathname}`);
    setMeta('link[rel="canonical"]', 'href', `${SITE_URL}${pathname}`);
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', isPrivate ? 'noindex,nofollow' : 'index,follow');
  }, [pathname]);
  return null;
}
