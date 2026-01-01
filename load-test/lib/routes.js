import {getTargetOrigin} from './config.js';

export function routes() {
  const origin = getTargetOrigin();
  return {
    home: `${origin}/`,
    articles: `${origin}/artikel`,
    podcasts: `${origin}/podcasts`,
    about: `${origin}/ueber-uns`,
    imprint: `${origin}/impressum`,
    privacy: `${origin}/datenschutz`,
    // APIs (lightweight)
    contentFeed: (page = 1, pageSize = 10) => `${origin}/api/contentfeed?page=${page}&pageSize=${pageSize}`,
    search: (q) => `${origin}/api/search-index?q=${encodeURIComponent(q)}`,
    // Feeds (hit rarely; may be rate limited)
    audioFeedXml: `${origin}/audiofeed.xml`,
    articleFeedXml: `${origin}/rss.xml`,
  };
}


