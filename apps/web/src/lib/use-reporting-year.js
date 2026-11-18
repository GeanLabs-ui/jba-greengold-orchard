import { useEffect, useState } from 'react';
import { reportingYear } from './analytics-periods';

export function useReportingYear() {
  const [year, setYear] = useState(() => reportingYear());
  useEffect(() => {
    const update = () => setYear(reportingYear());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  return year;
}
