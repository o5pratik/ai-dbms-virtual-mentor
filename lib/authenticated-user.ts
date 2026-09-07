export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

function decodeDisplayName(headers: Headers) {
  const encodedName = headers.get('oai-authenticated-user-full-name');
  const encoding = headers.get('oai-authenticated-user-full-name-encoding');
  if (!encodedName || encoding !== 'percent-encoded-utf-8') return '';
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return '';
  }
}

export function getAuthenticatedUser(headers: Headers): AuthenticatedUser | null {
  const id = headers.get('oai-authenticated-user-id')?.trim();
  const email = headers.get('oai-authenticated-user-email')?.trim();
  if (!id || !email) return null;
  return {
    id,
    email,
    name: decodeDisplayName(headers) || email.split('@')[0] || 'Student',
  };
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Sign in with ChatGPT to use your learning workspace.' },
    { status: 401 },
  );
}
