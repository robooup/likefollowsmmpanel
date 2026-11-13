export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const setting = (process.env.SSRF_GUARD || '').toLowerCase();
  const enabled = setting ? setting !== 'off' : process.env.NODE_ENV === 'production';
  if (enabled) {
    const { installSsrfGuard } = await import('./lib/security/ssrf-guard');
    await installSsrfGuard();
  }
}
