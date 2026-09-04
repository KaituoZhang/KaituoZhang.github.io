import data from '../generated/notion.json';

export interface RichText {
  text: string;
  href: string | null;
  annotations: Record<string, boolean | string>;
}

export interface NotionBlock {
  id: string;
  type: string;
  richText?: RichText[];
  children?: NotionBlock[];
  icon?: string;
  language?: string;
  caption?: string;
  src?: string | null;
  url?: string;
  expression?: string;
  cells?: RichText[][];
  hasColumnHeader?: boolean;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  language: string;
  translationKey: string;
  publishedDate: string;
  updatedDate: string;
  tags: string[];
  featured: boolean;
  cover: string | null;
  blocks: NotionBlock[];
  autoTranslated?: boolean;
  sourceLanguage?: string;
}

export const posts = (data.posts as Post[]).sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));

export function formatDate(value: string, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
