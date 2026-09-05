import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
import { base44 } from '@/api/base44Client';

let googleProps;
vi.mock('@/api/base44Client', () => ({ base44: { auth: { loginViaGoogle: vi.fn(async () => ({})) } } }));
vi.mock('@/lib/use-google-client-id', () => ({ useGoogleClientId: () => ({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, localLoginEnabled: import.meta.env.TEST_LOCAL_LOGIN === 'true', loading: false }) }));
vi.mock('@/components/LocalCustomerRegistration', () => ({ default: () => <form><input name="email" /><button>Create local client account</button></form> }));
vi.mock('@/components/GoogleSignInButton', () => ({ default: (props) => { googleProps = props; return <button>Continue with Google</button>; } }));

function render(path = '/register') {
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173', assign: vi.fn() } });
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><Register /></MemoryRouter>);
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('Google-only client sign-up', () => {
  it('shows customer registration locally instead of unavailable Google messaging', () => {
    vi.stubEnv('TEST_LOCAL_LOGIN', 'true');
    const html = render();
    expect(html).toContain('Create local client account');
    expect(html).toContain('<form');
    expect(html).not.toContain('Google sign-up is currently unavailable');
    expect(html).not.toContain('No separate password is needed');
  });
  it('shows Google sign-up without password or email registration fields', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    const html = render();
    expect(html).toContain('Continue with Google');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<form');
  });

  it('shows an actionable status when Google is not configured', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    const html = render();
    expect(html).toContain('Google sign-up is currently unavailable');
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain('<input');
  });

  it.each([
    ['/register', '/portal'],
    ['/register?from_url=%2Fcheckout', '/checkout'],
    ['/register?from_url=https%3A%2F%2Fevil.example', '/portal'],
    ['/register?from_url=%2Fadmin', '/portal'],
  ])('preserves a safe destination for %s', async (path, destination) => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    render(path);
    await googleProps.onCredential('test-google-credential');
    expect(base44.auth.loginViaGoogle).toHaveBeenCalledWith('test-google-credential', 'customer');
    expect(window.location.assign).toHaveBeenCalledWith(destination);
  });
});
