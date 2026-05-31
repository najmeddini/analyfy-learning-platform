/**
 * Notion block → HTML converter
 * Handles: paragraph, headings, lists, code, quote, divider,
 *          image, video, audio, embed, toggle, callout, table.
 */

export const revalidate = parseInt(process.env.REVALIDATE_TIME || '3600', 10);

// ─── Rich-text → HTML ────────────────────────────────────────────────────────

interface RichText {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

export function richTextToHtml(richTexts: RichText[]): string {
  return richTexts
    .map((rt) => {
      let text = escapeHtml(rt.plain_text);
      const a = rt.annotations ?? {};

      if (a.code)          text = `<code>${text}</code>`;
      if (a.bold)          text = `<strong>${text}</strong>`;
      if (a.italic)        text = `<em>${text}</em>`;
      if (a.strikethrough) text = `<s>${text}</s>`;
      if (a.underline)     text = `<u>${text}</u>`;
      if (a.color && a.color !== 'default') {
        const cssColor = notionColorToCss(a.color);
        text = `<span style="color:${cssColor}">${text}</span>`;
      }
      if (rt.href) {
        text = `<a href="${escapeAttr(rt.href)}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
      }
      return text;
    })
    .join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;');
}

function notionColorToCss(color: string): string {
  const map: Record<string, string> = {
    gray: '#6b7280', brown: '#92400e', orange: '#c2410c',
    yellow: '#b45309', green: '#15803d', blue: '#1d4ed8',
    purple: '#7c3aed', pink: '#db2777', red: '#dc2626',
    gray_background: '#f3f4f6', brown_background: '#fef3c7',
    orange_background: '#fff7ed', yellow_background: '#fefce8',
    green_background: '#f0fdf4', blue_background: '#eff6ff',
    purple_background: '#faf5ff', pink_background: '#fdf2f8',
    red_background: '#fef2f2',
  };
  return map[color] ?? 'inherit';
}

// ─── Block → HTML ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = Record<string, any>;

export function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const type: string = block.type;

    // Gather consecutive list items
    if (type === 'bulleted_list_item') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        const rt = blocks[i].bulleted_list_item?.rich_text ?? [];
        items.push(`<li>${richTextToHtml(rt)}</li>`);
        i++;
      }
      parts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (type === 'numbered_list_item') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        const rt = blocks[i].numbered_list_item?.rich_text ?? [];
        items.push(`<li>${richTextToHtml(rt)}</li>`);
        i++;
      }
      parts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    parts.push(blockToHtml(block));
    i++;
  }

  return parts.join('\n');
}

function blockToHtml(block: Block): string {
  const type: string = block.type;
  const data = block[type] ?? {};
  const rt: RichText[] = data.rich_text ?? [];
  const inner = richTextToHtml(rt);

  switch (type) {
    case 'paragraph':
      return inner ? `<p>${inner}</p>` : '<br>';

    case 'heading_1':
      return `<h1>${richTextToHtml(data.rich_text ?? [])}</h1>`;
    case 'heading_2':
      return `<h2>${richTextToHtml(data.rich_text ?? [])}</h2>`;
    case 'heading_3':
      return `<h3>${richTextToHtml(data.rich_text ?? [])}</h3>`;

    case 'quote':
      return `<blockquote>${inner}</blockquote>`;

    case 'divider':
      return '<hr>';

    case 'code': {
      const lang = data.language ?? '';
      const code = (data.rich_text ?? []).map((r: RichText) => escapeHtml(r.plain_text)).join('');
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    }

    case 'callout': {
      const emoji = data.icon?.emoji ?? '💡';
      return `<div class="callout"><span class="callout-icon">${emoji}</span><div>${inner}</div></div>`;
    }

    case 'toggle':
      return `<details><summary>${inner}</summary></details>`;

    case 'image': {
      const src = data.type === 'external' ? data.external?.url : data.file?.url;
      if (!src) return '';
      const caption = (data.caption ?? []).map((r: RichText) => r.plain_text).join('');
      return `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(caption)}" loading="lazy"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
    }

    case 'video': {
      const src = data.type === 'external' ? data.external?.url : data.file?.url;
      if (!src) return '';
      // YouTube / Vimeo → iframe
      if (/youtube\.com|youtu\.be|vimeo\.com/.test(src)) {
        const embedSrc = toEmbedUrl(src);
        return `<div class="embed-wrapper"><iframe src="${escapeAttr(embedSrc)}" allowfullscreen loading="lazy"></iframe></div>`;
      }
      return `<video controls src="${escapeAttr(src)}"></video>`;
    }

    case 'audio': {
      const src = data.type === 'external' ? data.external?.url : data.file?.url;
      if (!src) return '';
      return `<audio controls src="${escapeAttr(src)}"></audio>`;
    }

    case 'embed': {
      const url = data.url ?? '';
      return `<div class="embed-wrapper"><iframe src="${escapeAttr(url)}" allowfullscreen loading="lazy"></iframe></div>`;
    }

    case 'bookmark': {
      const url = data.url ?? '';
      const caption = (data.caption ?? []).map((r: RichText) => r.plain_text).join('') || url;
      return `<p><a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(caption)}</a></p>`;
    }

    case 'table': {
      // Table rows are child blocks — they won't appear here in a flat list
      // but can be handled if the caller passes children
      return '<table class="notion-table"></table>';
    }

    default:
      return '';
  }
}

function toEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}
