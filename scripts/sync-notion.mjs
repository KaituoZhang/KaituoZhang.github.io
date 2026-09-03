import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const token = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
const root = new URL('..', import.meta.url).pathname;
const outputFile = join(root, 'src/generated/notion.json');
const assetDirectory = join(root, 'public/notion-assets');
const notionVersion = '2026-03-11';

if (!token || !dataSourceId) {
  console.log('Notion credentials are not set; keeping the checked-in preview content.');
  process.exit(0);
}

await mkdir(assetDirectory, { recursive: true });

async function notion(path, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.notion.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': notionVersion,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (response.ok) return response.json();
    if (response.status === 429 && attempt < 3) {
      const delay = Number(response.headers.get('retry-after') ?? 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new Error(`Notion ${response.status}: ${await response.text()}`);
  }
}

async function paginate(path, body) {
  const results = [];
  let cursor;
  do {
    const payload = await notion(path, {
      method: 'POST',
      body: JSON.stringify({ ...body, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    results.push(...payload.results);
    cursor = payload.has_more ? payload.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function blockChildren(id) {
  const results = [];
  let cursor;
  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);
    const payload = await notion(`/blocks/${id}/children?${query}`);
    results.push(...payload.results);
    cursor = payload.has_more ? payload.next_cursor : undefined;
  } while (cursor);
  return results;
}

const plain = (items = []) => items.map((item) => item.plain_text ?? '').join('');
const rich = (items = []) => items.map((item) => ({
  text: item.plain_text ?? '',
  href: item.href ?? null,
  annotations: item.annotations ?? {},
}));

function propertyText(property) {
  if (!property) return '';
  if (property.type === 'title') return plain(property.title);
  if (property.type === 'rich_text') return plain(property.rich_text);
  if (property.type === 'select') return property.select?.name ?? '';
  if (property.type === 'status') return property.status?.name ?? '';
  return '';
}

function pageFileUrl(page) {
  const files = page.properties?.Cover?.files;
  const file = files?.[0];
  if (file) return file.type === 'external' ? file.external?.url : file.file?.url;
  if (page.cover) return page.cover.type === 'external' ? page.cover.external?.url : page.cover.file?.url;
  return null;
}

function contentTypeExtension(type, url) {
  const known = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg' };
  if (known[type]) return known[type];
  const candidate = extname(new URL(url).pathname).toLowerCase();
  return candidate && candidate.length <= 5 ? candidate : '.jpg';
}

async function localizeImage(url) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
  const extension = contentTypeExtension(response.headers.get('content-type')?.split(';')[0], url);
  const filename = `${hash}${extension}`;
  await writeFile(join(assetDirectory, filename), bytes);
  return `/notion-assets/${filename}`;
}

async function simplifyBlock(block) {
  const type = block.type;
  const value = block[type] ?? {};
  const item = { id: block.id, type };

  if (['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'quote', 'toggle', 'callout'].includes(type)) {
    item.richText = rich(value.rich_text);
    if (type === 'callout') item.icon = value.icon?.emoji ?? '✦';
  } else if (type === 'code') {
    item.richText = rich(value.rich_text);
    item.language = value.language ?? 'plain text';
    item.caption = plain(value.caption);
  } else if (type === 'image') {
    const url = value.type === 'external' ? value.external?.url : value.file?.url;
    item.src = await localizeImage(url);
    item.caption = plain(value.caption);
  } else if (type === 'bookmark') {
    item.url = value.url;
    item.caption = plain(value.caption);
  } else if (type === 'equation') {
    item.expression = value.expression;
  } else if (type === 'table') {
    item.hasColumnHeader = value.has_column_header;
  } else if (type === 'table_row') {
    item.cells = (value.cells ?? []).map(rich);
  }

  if (block.has_children) {
    const children = await blockChildren(block.id);
    item.children = [];
    for (const child of children) item.children.push(await simplifyBlock(child));
  }
  return item;
}

const pages = await paginate(`/data_sources/${dataSourceId}/query`, {
  page_size: 100,
  filter: { property: 'Status', status: { equals: 'Published' } },
  sorts: [{ property: 'PublishedDate', direction: 'descending' }],
});

const posts = [];
for (const page of pages) {
  const properties = page.properties ?? {};
  const slug = propertyText(properties.Slug);
  if (!slug) {
    console.warn(`Skipping a published page without a Slug: ${page.id}`);
    continue;
  }
  const rawBlocks = await blockChildren(page.id);
  posts.push({
    id: page.id,
    title: propertyText(properties.Name) || 'Untitled',
    slug,
    summary: propertyText(properties.Summary),
    language: propertyText(properties.Language) || 'en',
    translationKey: propertyText(properties.TranslationKey) || slug,
    publishedDate: properties.PublishedDate?.date?.start ?? page.created_time,
    updatedDate: page.last_edited_time,
    tags: properties.Tags?.multi_select?.map((tag) => tag.name) ?? [],
    featured: properties.Featured?.checkbox ?? false,
    cover: await localizeImage(pageFileUrl(page)),
    blocks: [],
  });
  const post = posts.at(-1);
  for (const block of rawBlocks) post.blocks.push(await simplifyBlock(block));
}

await writeFile(outputFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), posts }, null, 2)}\n`);
console.log(`Synced ${posts.length} published Notion post(s).`);
