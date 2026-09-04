import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const token = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
const translationApiKey = process.env.OPENAI_API_KEY;
const translationModel = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini';
const root = new URL('..', import.meta.url).pathname;
const outputFile = join(root, 'src/generated/notion.json');
const assetDirectory = join(root, 'public/notion-assets');
const translationCacheDirectory = join(root, '.translation-cache');
const notionVersion = '2026-03-11';

if (!token || !dataSourceId) {
  console.log('Notion credentials are not set; keeping the checked-in preview content.');
  process.exit(0);
}

await mkdir(assetDirectory, { recursive: true });
await mkdir(translationCacheDirectory, { recursive: true });

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

const normalizedLanguage = (value) => String(value || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
const hasWords = (value) => /[\p{L}\p{Script=Han}]/u.test(value || '');

function translationUnits(post) {
  const units = [];
  const add = (id, text) => { if (hasWords(text)) units.push({ id, text }); };
  add('title', post.title);
  add('summary', post.summary);

  const visit = (blocks, prefix = 'blocks') => {
    for (const [blockIndex, block] of blocks.entries()) {
      const blockPath = `${prefix}.${blockIndex}`;
      if (block.type !== 'code') {
        for (const [textIndex, item] of (block.richText ?? []).entries()) add(`${blockPath}.richText.${textIndex}.text`, item.text);
        if (block.caption) add(`${blockPath}.caption`, block.caption);
        for (const [rowIndex, row] of (block.cells ?? []).entries()) {
          for (const [cellIndex, cell] of row.entries()) {
            for (const [textIndex, item] of cell.entries()) add(`${blockPath}.cells.${rowIndex}.${cellIndex}.${textIndex}.text`, item.text);
          }
        }
      }
      if (block.children?.length) visit(block.children, `${blockPath}.children`);
    }
  };
  visit(post.blocks);
  return units;
}

function setPath(target, path, value) {
  const parts = path.split('.');
  const final = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  cursor[final] = value;
}

function responseText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) if (content.type === 'output_text' && content.text) return content.text;
  }
  throw new Error('Translation response did not contain output text.');
}

async function requestTranslation(units, sourceLanguage, targetLanguage) {
  const schema = {
    type: 'object', additionalProperties: false, required: ['translations'],
    properties: {
      translations: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'text'],
          properties: { id: { type: 'string' }, text: { type: 'string' } },
        },
      },
    },
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${translationApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: translationModel,
      store: false,
      instructions: `You are a careful bilingual technical editor. Translate every item from ${sourceLanguage === 'zh' ? 'Simplified Chinese' : 'English'} to ${targetLanguage === 'zh' ? 'natural Simplified Chinese' : 'natural academic English'}. Preserve technical terms, LeetCode problem numbers, Markdown, inline code, URLs, names, and meaning. Do not add commentary. Return every id exactly once.`,
      input: JSON.stringify({ items: units }),
      text: { format: { type: 'json_schema', name: 'blog_translation', strict: true, schema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  return JSON.parse(responseText(await response.json())).translations;
}

function validTranslations(units, translations) {
  if (!Array.isArray(translations)) return false;
  const expected = new Set(units.map((unit) => unit.id));
  const returnedIds = new Set(translations.map((item) => item.id));
  return translations.length === expected.size && returnedIds.size === expected.size && translations.every((item) => expected.has(item.id) && typeof item.text === 'string');
}

function translationBatches(units) {
  const batches = [];
  let batch = [];
  let characters = 0;
  for (const unit of units) {
    if (batch.length && (batch.length >= 30 || characters + unit.text.length > 8000)) {
      batches.push(batch);
      batch = [];
      characters = 0;
    }
    batch.push(unit);
    characters += unit.text.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function requestValidTranslation(units, sourceLanguage, targetLanguage) {
  const translations = await requestTranslation(units, sourceLanguage, targetLanguage);
  if (validTranslations(units, translations)) return translations;
  if (units.length === 1) throw new Error(`Translation response omitted ${units[0].id}.`);
  const middle = Math.ceil(units.length / 2);
  return [
    ...await requestValidTranslation(units.slice(0, middle), sourceLanguage, targetLanguage),
    ...await requestValidTranslation(units.slice(middle), sourceLanguage, targetLanguage),
  ];
}

async function translatedPost(post, targetLanguage) {
  const sourceLanguage = normalizedLanguage(post.language);
  const units = translationUnits(post);
  const cacheHash = createHash('sha256').update(JSON.stringify({ cacheVersion: 2, model: translationModel, sourceLanguage, targetLanguage, units })).digest('hex');
  const cacheFile = join(translationCacheDirectory, `${cacheHash}.json`);
  let translations;
  try {
    translations = JSON.parse(await readFile(cacheFile, 'utf8'));
    if (!validTranslations(units, translations)) throw new Error('Invalid translation cache.');
    console.log(`Using cached ${sourceLanguage}→${targetLanguage} translation for ${post.slug}.`);
  } catch {
    if (!translationApiKey) return null;
    translations = [];
    for (const batch of translationBatches(units)) {
      const translatedBatch = await requestValidTranslation(batch, sourceLanguage, targetLanguage);
      translations.push(...translatedBatch);
    }
    await writeFile(cacheFile, `${JSON.stringify(translations, null, 2)}\n`);
    console.log(`Translated ${post.slug} from ${sourceLanguage} to ${targetLanguage} with ${translationModel}.`);
  }

  if (!validTranslations(units, translations)) throw new Error(`Translation shape mismatch for ${post.slug}.`);
  const result = structuredClone(post);
  for (const item of translations) setPath(result, item.id, item.text);
  result.id = `${post.id}-${targetLanguage}-auto`;
  result.language = targetLanguage;
  result.autoTranslated = true;
  result.sourceLanguage = sourceLanguage;
  return result;
}

async function addMissingTranslations(posts) {
  if (!translationApiKey) console.log('OPENAI_API_KEY is not set; publishing source-language posts only unless a cached translation exists.');
  const originalPosts = [...posts];
  for (const post of originalPosts) {
    const sourceLanguage = normalizedLanguage(post.language);
    const targetLanguage = sourceLanguage === 'zh' ? 'en' : 'zh';
    const translationKey = post.translationKey || post.slug;
    const hasManualTranslation = originalPosts.some((candidate) => (candidate.translationKey || candidate.slug) === translationKey && normalizedLanguage(candidate.language) === targetLanguage);
    if (hasManualTranslation) continue;
    try {
      const translated = await translatedPost(post, targetLanguage);
      if (translated) posts.push(translated);
    } catch (error) {
      console.warn(`Automatic translation skipped for ${post.slug}: ${error.message}`);
    }
  }
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

await addMissingTranslations(posts);

await writeFile(outputFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), posts }, null, 2)}\n`);
console.log(`Synced ${posts.length} published Notion post(s).`);
