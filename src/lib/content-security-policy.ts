export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean
): string {
  const styleSources = isDevelopment
    ? "'self' 'unsafe-inline'"
    : `'self' 'nonce-${nonce}'`

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''};
    style-src ${styleSources};
    img-src 'self' blob: data:;
    font-src 'self' data:;
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}
