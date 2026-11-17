import type { AdminSession, BlogPost, PostFields, UploadedCover } from '../../shared/cms';

const API_ROOT = '/api/admin';

export class CmsApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'CmsApiError';
    this.status = status;
    this.code = code;
  }
}

function safeServerMessage(value: unknown, status: number): string {
  if (status === 401) return 'Sua sessão terminou. Entre novamente para continuar.';
  if (status === 403) return 'O acesso administrativo não está disponível para esta conta.';
  if (status === 409) return 'Este artigo foi alterado desde a última leitura.';
  if (typeof value === 'string' && value.trim()) {
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 280);
  }
  return 'Não foi possível concluir a solicitação. Tente novamente.';
}

async function request<T>(path: string, options: RequestInit = {}, root = API_ROOT): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${root}${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new CmsApiError('Não foi possível conectar ao CMS. Confira a conexão e tente novamente.', 0);
  }

  const raw = await response.text();
  let payload: unknown;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as { error?: unknown; code?: unknown } : undefined;
    const code = typeof body?.code === 'string' ? body.code.slice(0, 80) : undefined;
    throw new CmsApiError(safeServerMessage(body?.error, response.status), response.status, code);
  }
  if (response.status === 204 || !raw) return undefined as T;
  if (payload === undefined) throw new CmsApiError('O CMS retornou uma resposta inválida. Tente novamente.', response.status);
  return payload as T;
}

function jsonHeaders(csrfToken?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };
}

export function getAdminSession(): Promise<AdminSession> {
  return request<AdminSession>('/session');
}

export function getAdminPosts(): Promise<{ posts: BlogPost[] }> {
  return request<{ posts: BlogPost[] }>('/posts');
}

export function getAdminPost(id: number): Promise<{ post: BlogPost }> {
  return request<{ post: BlogPost }>(`/posts/${encodeURIComponent(String(id))}`);
}

export function createAdminPost(fields: PostFields, csrfToken?: string): Promise<{ post: BlogPost }> {
  return request<{ post: BlogPost }>('/posts', {
    method: 'POST',
    headers: jsonHeaders(csrfToken),
    body: JSON.stringify(fields),
  });
}

export function updateAdminPost(id: number, fields: PostFields, revision: number, csrfToken?: string): Promise<{ post: BlogPost }> {
  return request<{ post: BlogPost }>(`/posts/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: jsonHeaders(csrfToken),
    body: JSON.stringify({ ...fields, revision }),
  });
}

export function uploadAdminCover(file: File, csrfToken?: string): Promise<UploadedCover> {
  return request<UploadedCover>('/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: file,
  });
}

export function publishAdminPost(id: number, revision: number, csrfToken?: string): Promise<{ post: BlogPost }> {
  return request<{ post: BlogPost }>(`/posts/${encodeURIComponent(String(id))}/publish`, {
    method: 'POST',
    headers: jsonHeaders(csrfToken),
    body: JSON.stringify({ revision }),
  });
}

export function unpublishAdminPost(id: number, revision: number, csrfToken?: string): Promise<{ post: BlogPost }> {
  return request<{ post: BlogPost }>(`/posts/${encodeURIComponent(String(id))}/unpublish`, {
    method: 'POST',
    headers: jsonHeaders(csrfToken),
    body: JSON.stringify({ revision }),
  });
}

export function loginAdmin(email: string, password: string): Promise<void> {
  return request<void>('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, '/api/auth');
}

export function logoutAdmin(csrfToken?: string): Promise<void> {
  return request<void>('/logout', {
    method: 'POST',
    headers: jsonHeaders(csrfToken),
    body: JSON.stringify({}),
  }, '/api/auth');
}
