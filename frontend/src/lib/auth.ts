export interface AuthUser {
  id: string;
  email: string;
  role: 'APPLICANT' | 'REVIEWER' | 'DECISION_MAKER' | 'ADMIN';
}

function parseJwt(token: string): AuthUser | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const p = JSON.parse(json);
    return { id: p.sub, email: p.email, role: p.role };
  } catch {
    return null;
  }
}

export function getUser(): AuthUser | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return parseJwt(token);
}

export function isAuthenticated(): boolean {
  return !!getUser();
}

export function logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
