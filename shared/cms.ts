export type PostStatus = 'draft' | 'published';

export interface PostFields {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  coverUrl: string;
  coverAlt: string;
  bodyHtml: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
}

export interface BlogPost extends PostFields {
  author?: string;
  sources?: string;
  id: number;
  status: PostStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AdminSession {
  authenticated: boolean;
  authorized: boolean;
  configured: boolean;
  name?: string;
  csrfToken?: string;
  reason?: string;
}

export interface CmsError { error: string; code?: string; }
export interface UploadedCover { url: string; mediaId: number; }

export const defaultPostFields: PostFields = {
  title: '', slug: '', excerpt: '', category: 'Mercado de brinquedos',
  coverUrl: '', coverAlt: '', bodyHtml: '', seoTitle: '', seoDescription: '', featured: false,
};
