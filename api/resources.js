/* ============================================================
   GET /api/resources
   Returns published resource cards from Notion, grouped by
   Category (Videos / Podcasts / X Accounts / Articles).
   ============================================================ */

export default async function handler(req, res) {
  const dbId  = process.env.NOTION_DB_RESOURCES;
  const token = process.env.NOTION_TOKEN;

  if (!dbId || !token) {
    return res.status(500).json({ error: 'Missing Notion env vars' });
  }

  const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: {
        property: 'Status',
        select: { equals: 'Published' },
      },
    }),
  });

  if (!notionRes.ok) {
    return res.status(502).json({ error: 'Notion API error', status: notionRes.status });
  }

  const data = await notionRes.json();

  const resources = (data.results || []).map(page => {
    const props = page.properties;
    return {
      id:       page.id,
      name:     richText(props.Name?.title),
      category: props.Category?.select?.name ?? '',
      url:      props.URL?.url ?? '#',
      platform: richText(props.Platform?.rich_text),
      icon:     richText(props.Icon?.rich_text),
    };
  });

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json(resources);
}

function richText(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map(t => t.plain_text ?? '').join('');
}
