/**
 * Resolves direct raw audio stream URLs from YouTube IDs
 * to bypass mobile YouTube iframe background audio restrictions.
 */

const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.video',
  'https://invidious.drgns.space'
];

export const getDirectAudioUrl = async (youtubeId) => {
  if (!youtubeId) throw new Error('Missing YouTube video ID');

  for (const instance of INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${youtubeId}`);
      if (!res.ok) continue;

      const data = await res.json();
      
      // Filter for best audio-only streams (WebM or M4A)
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length === 0) continue;

      // Select highest bitrate stream
      audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      return audioStreams[0].url;
    } catch (err) {
      console.warn(`Stream fetch failed on ${instance}, trying next...`);
    }
  }

  // Fallback to Piped direct audio proxy if API queries fail
  return `https://pipedapi.kavin.rocks/api/v1/stream/${youtubeId}?quality=low`;
};
