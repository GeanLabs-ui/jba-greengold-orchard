import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function CustomerAccessDenied() {
  const { logout } = useAuth();
  const switchAccount = async () => {
    await logout(false);
    window.location.assign('/login?from_url=/portal');
  };
  return <div className="min-h-[60vh] px-4 py-16 text-center">
    <h1 className="font-heading text-2xl font-semibold">Customer account required</h1>
    <p className="mt-3 text-muted-foreground">Use your own verified customer account to access orders, payments, and documents.</p>
    <div className="mt-6 flex justify-center gap-3">
      <Button onClick={switchAccount}>Switch to customer login</Button>
      <Button asChild variant="outline"><Link to="/admin">Staff workspace</Link></Button>
    </div>
  </div>;
}
