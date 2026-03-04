/* ============================================================
   GET /api/post?id=NOTION_PAGE_ID
   Fetches a Notion page's metadata and block children, returns
   { title, issue, date, excerpt, bodyHtml } for rendering.
   ============================================================ */

export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Missing NOTION_TOKEN env var' });
  }

  const pageId = req.query?.id;
  if (!pageId) {
    return res.status(400).json({ error: 'Missing ?id= parameter' });
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // Fetch page metadata and blocks in parallel
  const [pageRes, blocksRes] = await Promise.all([
    fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers }),
    fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, { headers }),
  ]);

  if (!pageRes.ok) {
    return res.status(pageRes.status).json({ error: 'Could not fetch Notion page' });
  }
  if (!blocksRes.ok) {
    return res.status(blocksRes.status).json({ error: 'Could not fetch Notion blocks' });
  }

  const [page, blocksData] = await Promise.all([pageRes.json(), blocksRes.json()]);

  const props   = page.properties;
  const title   = richText(props.Title?.title);
  const issue   = props.Issue?.number ?? null;
  const date    = props.Date?.date?.start ?? null;
  const excerpt = richText(props.Excerpt?.rich_text);
  const blocks  = blocksData.results ?? [];

  const bodyHtml = blocksToHtml(blocks);

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ title, issue, date, excerpt, bodyHtml });
}

/* ---------------------------------------------------------------
   Block → HTML conversion
--------------------------------------------------------------- */
function blocksToHtml(blocks) {
  const parts = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const type  = block.type;

    // Group consecutive bulleted list items
    if (type === 'bulleted_list_item') {
      const items = [];
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        items.push(`<li>${richTextToHtml(blocks[i].bulleted_list_item.rich_text)}</li>`);
        i++;
      }
      parts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Group consecutive numbered list items
    if (type === 'numbered_list_item') {
      const items = [];
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        items.push(`<li>${richTextToHtml(blocks[i].numbered_list_item.rich_text)}</li>`);
        i++;
      }
      parts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    switch (type) {
      case 'paragraph': {
        const text = richTextToHtml(block.paragraph.rich_text);
        if (text.trim()) parts.push(`<p>${text}</p>`);
        break;
      }
      case 'heading_1': {
        const text = richTextToHtml(block.heading_1.rich_text);
        if (text.trim()) parts.push(`<h2>${text}</h2>`);
        break;
      }
      case 'heading_2': {
        const text = richTextToHtml(block.heading_2.rich_text);
        if (text.trim()) parts.push(`<h2>${text}</h2>`);
        break;
      }
      case 'heading_3': {
        const text = richTextToHtml(block.heading_3.rich_text);
        if (text.trim()) parts.push(`<h3>${text}</h3>`);
        break;
      }
      case 'quote': {
        const text = richTextToHtml(block.quote.rich_text);
        if (text.trim()) parts.push(`<blockquote>${text}</blockquote>`);
        break;
      }
      case 'image': {
        const imgBlock = block.image;
        const url = imgBlock.type === 'external'
          ? imgBlock.external.url
          : imgBlock.file?.url ?? '';
        const caption = imgBlock.caption?.length
          ? richTextToHtml(imgBlock.caption)
          : '';
        if (url) {
          parts.push(
            `<figure>` +
            `<img src="${escHtml(url)}" alt="${escHtml(caption || '')}" loading="lazy">` +
            (caption ? `<figcaption>${caption}</figcaption>` : '') +
            `</figure>`
          );
        }
        break;
      }
      case 'divider':
        parts.push('<hr>');
        break;
      case 'code': {
        const text = block.code.rich_text.map(t => t.plain_text).join('');
        parts.push(`<pre><code>${escHtml(text)}</code></pre>`);
        break;
      }
      default:
        // Unsupported block type — silently skip
        break;
    }

    i++;
  }

  return parts.join('\n');
}

/* ---------------------------------------------------------------
   Rich text array → HTML string
--------------------------------------------------------------- */
function richTextToHtml(arr) {
  if (!Array.isArray(arr)) return '';

  return arr.map(t => {
    let text = escHtml(t.plain_text ?? '');
    const a  = t.annotations ?? {};

    if (a.code)          text = `<code>${text}</code>`;
    if (a.bold)          text = `<strong>${text}</strong>`;
    if (a.italic)        text = `<em>${text}</em>`;
    if (a.strikethrough) text = `<del>${text}</del>`;
    if (a.underline)     text = `<u>${text}</u>`;

    if (t.href) text = `<a href="${escHtml(t.href)}" target="_blank" rel="noopener">${text}</a>`;

    return text;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function richText(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map(t => t.plain_text ?? '').join('');
}
