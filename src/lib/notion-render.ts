import type { NotionBlock, RichText } from './notion';

const escapeHtml = (value = '') => value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character);

function safeUrl(value?: string | null) {
  if (!value) return '#';
  if (value.startsWith('/') || /^(https?:|mailto:)/i.test(value)) return escapeHtml(value);
  return '#';
}

function renderRichText(items: RichText[] = []) {
  return items.map((item) => {
    let content = escapeHtml(item.text);
    const annotations = item.annotations ?? {};
    if (annotations.code) content = `<code>${content}</code>`;
    if (annotations.bold) content = `<strong>${content}</strong>`;
    if (annotations.italic) content = `<em>${content}</em>`;
    if (annotations.underline) content = `<u>${content}</u>`;
    if (annotations.strikethrough) content = `<s>${content}</s>`;
    if (item.href) content = `<a href="${safeUrl(item.href)}">${content}</a>`;
    return content;
  }).join('');
}

function renderBlock(block: NotionBlock): string {
  const text = renderRichText(block.richText);
  const children = renderBlocks(block.children ?? []);
  switch (block.type) {
    case 'paragraph': return `<p>${text}</p>${children}`;
    case 'heading_1': return `<h2>${text}</h2>${children}`;
    case 'heading_2': return `<h3>${text}</h3>${children}`;
    case 'heading_3': return `<h4>${text}</h4>${children}`;
    case 'bulleted_list_item': return `<ul><li>${text}${children}</li></ul>`;
    case 'numbered_list_item': return `<ol><li>${text}${children}</li></ol>`;
    case 'quote': return `<blockquote>${text}</blockquote>${children}`;
    case 'callout': return `<aside class="notion-callout"><span aria-hidden="true">${escapeHtml(block.icon || '✦')}</span><div>${text}${children}</div></aside>`;
    case 'toggle': return `<details><summary>${text}</summary>${children}</details>`;
    case 'code': return `<figure class="code-block"><pre><code>${escapeHtml(block.richText?.map((item) => item.text).join('') ?? '')}</code></pre>${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
    case 'image': return block.src ? `<figure><img src="${safeUrl(block.src)}" alt="${escapeHtml(block.caption || '')}" loading="lazy">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>` : '';
    case 'divider': return '<hr>';
    case 'bookmark': return `<p class="bookmark"><a href="${safeUrl(block.url)}">${escapeHtml(block.caption || block.url || 'Open link')} ↗</a></p>`;
    case 'equation': return `<pre class="equation">${escapeHtml(block.expression)}</pre>`;
    case 'table': return `<div class="table-scroll"><table><tbody>${children}</tbody></table></div>`;
    case 'table_row': return `<tr>${block.cells?.map((cell) => `<td>${renderRichText(cell)}</td>`).join('') ?? ''}</tr>`;
    default: return children;
  }
}

export function renderBlocks(blocks: NotionBlock[] = []) {
  return blocks.map(renderBlock).join('');
}
