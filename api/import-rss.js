export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get('playlistId');

  if (!playlistId) {
    return new Response(JSON.stringify({ error: 'Missing playlistId' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    const response = await fetch(rssUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch YouTube RSS feed' }), {
        status: response.status,
        headers: { 'content-type': 'application/json' },
      });
    }

    const xmlText = await response.text();
    return new Response(JSON.stringify({ xmlText }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=3600, stale-while-revalidate'
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
