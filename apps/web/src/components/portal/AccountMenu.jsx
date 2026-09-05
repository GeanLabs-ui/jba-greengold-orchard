import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, UserRoundCog } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function AccountAvatar({ user, className = 'h-9 w-9' }) {
  const name = user?.full_name || user?.email || 'Customer';
  return <Avatar className={className}><AvatarImage src={user?.photo_file_id ? base44.account.fileUrl(user.photo_file_id) : undefined} alt="Profile photo" /><AvatarFallback className="bg-primary font-semibold text-white">{name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>;
}

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signOut = async () => {
    setBusy(true); setError('');
    try { await logout(true); } catch { setError('Sign-out failed. Please try again.'); setBusy(false); }
  };
  return <div className="relative">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" disabled={busy} aria-label={`Account menu for ${user?.full_name || user?.email || 'Customer'}`} className="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ACD32] hover:bg-[#9ACD32]/20"><AccountAvatar user={user} /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] w-64 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel><span className="block truncate">{user?.full_name || 'My Account'}</span><span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/portal/account"><UserRoundCog className="mr-2 h-4 w-4" />Account Setup</Link></DropdownMenuItem>
        <DropdownMenuItem disabled={busy} onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />{busy ? 'Signing out…' : 'Sign out'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {error && <p role="alert" className="absolute right-0 top-full z-50 w-64 rounded border bg-background p-3 text-sm text-destructive">{error}</p>}
  </div>;
}
