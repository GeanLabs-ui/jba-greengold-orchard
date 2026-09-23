import { useEffect, useState } from 'react';
import { subscribeToDataChanges } from '@/lib/data-sync';

export function useProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let version = 0;
    const load = async () => {
      const current = ++version;
      try {
        const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')}/commerce/catalog`);
        if (!response.ok) throw new Error('Products could not be loaded. Please try again.');
        const result = await response.json();
        if (active && current === version) { setProducts(result.data); setError(''); }
      } catch (failure) { if (active && current === version) setError(failure.message); }
      finally { if (active && current === version) setLoading(false); }
    };
    load();
    const unsubscribe = subscribeToDataChanges(load, ['Product']);
    window.addEventListener('focus', load);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', load); };
  }, []);
  return { products, loading, error };
}
