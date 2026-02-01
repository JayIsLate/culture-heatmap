#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

let browser = null;

// Initialize browser with anti-detection measures
async function getBrowser() {
  try {
    if (!browser || !browser.isConnected()) {
      if (browser) {
        try { await browser.close(); } catch (e) {}
      }
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080'
        ]
      });
      // Wait for browser to be fully ready
      await new Promise(r => setTimeout(r, 500));
    }
    return browser;
  } catch (error) {
    browser = null;
    throw error;
  }
}

// Parse metric strings like "2.3M", "171K", "4.2K"
function parseMetric(str) {
  if (!str) return 0;
  const clean = str.replace(/,/g, '').trim();
  const match = clean.match(/^([\d.]+)([KMB])?$/i);
  if (!match) return parseInt(clean) || 0;

  const num = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();

  if (suffix === 'K') return Math.round(num * 1000);
  if (suffix === 'M') return Math.round(num * 1000000);
  if (suffix === 'B') return Math.round(num * 1000000000);
  return Math.round(num);
}

// Helper to set up page with anti-detection
async function setupPage(page) {
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });
}

// Scrape TikTok post
async function scrapeTikTokPost(url) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Wait for page to be ready before setup
    await new Promise(r => setTimeout(r, 500));
    await setupPage(page);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    if (page.isClosed()) {
      throw new Error('Page was closed unexpectedly');
    }

    // Try to close any popups/modals
    try {
      const closeButtons = await page.$$('[aria-label="Close"]');
      for (const btn of closeButtons) {
        await btn.click().catch(() => {});
      }
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));

    const metrics = await page.evaluate(() => {
      const result = {
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        views: 0,
        title: '',
        creator: '',
        postedAt: null
      };

      // Multiple selector strategies for likes
      const likeSelectors = [
        '[data-e2e="like-count"]',
        '[data-e2e="browse-like-count"]',
        'strong[data-e2e="like-count"]',
        '[class*="like"] [class*="count"]',
        '[class*="DivActionItemContainer"] strong'
      ];

      for (const sel of likeSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          result.likes = el.innerText.trim();
          break;
        }
      }

      // Multiple selector strategies for comments
      const commentSelectors = [
        '[data-e2e="comment-count"]',
        '[data-e2e="browse-comment-count"]',
        'strong[data-e2e="comment-count"]'
      ];

      for (const sel of commentSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          result.comments = el.innerText.trim();
          break;
        }
      }

      // Shares
      const shareSelectors = [
        '[data-e2e="share-count"]',
        '[data-e2e="browse-share-count"]'
      ];

      for (const sel of shareSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          result.shares = el.innerText.trim();
          break;
        }
      }

      // Saves/Favorites
      const saveSelectors = [
        '[data-e2e="undefined-count"]',
        '[data-e2e="browse-save-count"]',
        '[data-e2e="favorite-count"]'
      ];

      for (const sel of saveSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          result.saves = el.innerText.trim();
          break;
        }
      }

      // Get creator
      const creatorSelectors = [
        '[data-e2e="browse-username"]',
        '[data-e2e="video-author-uniqueid"]',
        'a[href*="/@"] span',
        'h3[data-e2e="browse-username"]'
      ];

      for (const sel of creatorSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          result.creator = el.innerText.trim();
          break;
        }
      }

      // Get title/description
      const titleSelectors = [
        '[data-e2e="browse-video-desc"]',
        '[data-e2e="video-desc"]',
        'h1[data-e2e="browse-video-desc"]',
        '[class*="DivVideoInfoContainer"] span'
      ];

      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          result.title = el.innerText.slice(0, 100);
          break;
        }
      }

      // Fallback to text matching
      if (!result.likes) {
        const text = document.body.innerText;
        const likesMatch = text.match(/(\d+(?:\.\d+)?[KMB]?)\s*(?:likes?|Likes?)/);
        if (likesMatch) result.likes = likesMatch[1];
      }

      // Extract posted date - look for the first date pattern (video post date)
      const dateSpans = document.querySelectorAll('span');
      for (const span of dateSpans) {
        const text = span.innerText?.trim();
        if (!text || text.length > 20) continue;

        // Month-day format: anything followed by M-D pattern (like "· 1-20")
        const mdMatch = text.match(/(\d{1,2})-(\d{1,2})$/);
        if (mdMatch && text.length < 15) {
          const month = mdMatch[1];
          const day = mdMatch[2];
          const currentYear = new Date().getFullYear();
          result.postedAt = currentYear + '-' + month + '-' + day;
          break;
        }
        // Relative time: 1w ago, 3d ago, 5h ago
        const relMatch = text.match(/^(\d+)(h|d|w|m)\s*ago$/i);
        if (relMatch) {
          const num = parseInt(relMatch[1]);
          const unit = relMatch[2].toLowerCase();
          const now = new Date();
          if (unit === 'h') now.setHours(now.getHours() - num);
          else if (unit === 'd') now.setDate(now.getDate() - num);
          else if (unit === 'w') now.setDate(now.getDate() - num * 7);
          else if (unit === 'm') now.setMonth(now.getMonth() - num);
          result.postedAt = now.toISOString().split('T')[0];
          break;
        }
      }

      return result;
    });

    // Capture screenshot of the video
    let imageBase64 = '';
    try {
      const videoElement = await page.$('video') ||
                           await page.$('[data-e2e="browse-video"]') ||
                           await page.$('[class*="DivVideoContainer"] video');
      if (videoElement) {
        const screenshot = await videoElement.screenshot({ encoding: 'base64' });
        imageBase64 = `data:image/png;base64,${screenshot}`;
      } else {
        const mainArea = await page.$('[data-e2e="browse-video-container"]') ||
                         await page.$('[class*="DivContentContainer"]') ||
                         await page.$('main');
        if (mainArea) {
          const screenshot = await mainArea.screenshot({ encoding: 'base64' });
          imageBase64 = `data:image/png;base64,${screenshot}`;
        }
      }
    } catch (screenshotError) {
      // Screenshot failed, continue without it
    }

    return {
      success: true,
      likes: parseMetric(metrics.likes),
      comments: parseMetric(metrics.comments),
      shares: parseMetric(metrics.shares),
      saves: parseMetric(metrics.saves),
      views: parseMetric(metrics.views),
      postedAt: metrics.postedAt,
      title: metrics.title,
      creator: metrics.creator,
      image: imageBase64
    };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
  }
}

// Scrape TikTok profile
async function scrapeTikTokProfile(url) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await new Promise(r => setTimeout(r, 500));
    await setupPage(page);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    if (page.isClosed()) {
      throw new Error('Page was closed unexpectedly');
    }

    // Try to close any popups
    try {
      const closeButtons = await page.$$('[aria-label="Close"]');
      for (const btn of closeButtons) {
        await btn.click().catch(() => {});
      }
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));

    const metrics = await page.evaluate(() => {
      const followerSelectors = [
        '[data-e2e="followers-count"]',
        '[title*="Followers"]',
        'strong[title*="Followers"]'
      ];

      for (const sel of followerSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) {
          return { followers: el.innerText.trim() };
        }
      }

      const text = document.body.innerText;
      const followersMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Followers/i);

      return {
        followers: followersMatch ? followersMatch[1] : '0'
      };
    });

    return {
      success: true,
      followers: parseMetric(metrics.followers)
    };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
  }
}

// Scrape Instagram post
async function scrapeInstagramPost(url) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await new Promise(r => setTimeout(r, 500));
    await setupPage(page);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    // Close login modal if it appears
    try {
      await page.waitForSelector('svg[aria-label="Close"]', { timeout: 3000 });
      await page.click('svg[aria-label="Close"]');
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {}

    const metrics = await page.evaluate(() => {
      const result = {
        likes: 0,
        comments: 0,
        views: 0,
        postedAt: null,
        title: '',
        creator: '',
        image: ''
      };

      const text = document.body.innerText;
      const lines = text.split('\n');
      const metricLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^(\d+\.?\d*[MK])$/i.test(trimmed)) {
          metricLines.push(trimmed);
        }
      }

      if (metricLines.length >= 1) {
        result.likes = metricLines[0];
      }
      if (metricLines.length >= 2) {
        result.comments = metricLines[1];
      }

      const likesMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*likes?/i);
      if (likesMatch && !result.likes) {
        result.likes = likesMatch[1];
      }

      const commentsMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*comments?/i);
      if (commentsMatch && !result.comments) {
        result.comments = commentsMatch[1];
      }

      const viewsMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*(?:views?|plays?)/i);
      if (viewsMatch) result.views = viewsMatch[1];

      const timeEl = document.querySelector('time');
      if (timeEl) {
        result.postedAt = timeEl.getAttribute('datetime') || timeEl.innerText;
      }

      const creatorEl = document.querySelector('a[href*="/"] span') ||
                        document.querySelector('header a');
      if (creatorEl) result.creator = creatorEl.innerText;

      const captionEl = document.querySelector('h1') ||
                        document.querySelector('span[dir="auto"]');
      if (captionEl) result.title = captionEl.innerText?.slice(0, 100);

      return result;
    });

    // Capture screenshot
    let imageBase64 = '';
    try {
      const mediaElement = await page.$('article video, article img, div[role="button"] img');
      if (mediaElement) {
        const screenshot = await mediaElement.screenshot({ encoding: 'base64' });
        imageBase64 = `data:image/png;base64,${screenshot}`;
      } else {
        const postArea = await page.$('article') || await page.$('main');
        if (postArea) {
          const screenshot = await postArea.screenshot({ encoding: 'base64' });
          imageBase64 = `data:image/png;base64,${screenshot}`;
        }
      }
    } catch (screenshotError) {}

    return {
      success: true,
      likes: parseMetric(metrics.likes),
      comments: parseMetric(metrics.comments),
      views: parseMetric(metrics.views),
      postedAt: metrics.postedAt,
      title: metrics.title,
      creator: metrics.creator,
      image: imageBase64
    };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
  }
}

// Scrape Instagram profile
async function scrapeInstagramProfile(url) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await new Promise(r => setTimeout(r, 500));
    await setupPage(page);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    try {
      await page.waitForSelector('svg[aria-label="Close"]', { timeout: 3000 });
      await page.click('svg[aria-label="Close"]');
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {}

    const metrics = await page.evaluate(() => {
      const text = document.body.innerText;
      const followersMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*followers?/i);

      return {
        followers: followersMatch ? followersMatch[1] : '0'
      };
    });

    return {
      success: true,
      followers: parseMetric(metrics.followers)
    };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'social-metrics-scraper',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'scrape_social_metrics',
        description: 'Scrape metrics (likes, comments, shares, saves, views, followers) and capture a screenshot from a TikTok or Instagram post. Returns engagement metrics and a base64 image.',
        inputSchema: {
          type: 'object',
          properties: {
            postUrl: {
              type: 'string',
              description: 'URL of the TikTok or Instagram post to scrape metrics from'
            },
            profileUrl: {
              type: 'string',
              description: 'Optional URL of the profile to get follower count'
            }
          },
          required: ['postUrl']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'scrape_social_metrics') {
    const { postUrl, profileUrl } = args;

    if (!postUrl) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'postUrl is required' }) }]
      };
    }

    const isInstagram = postUrl.includes('instagram.com');
    const isTikTok = postUrl.includes('tiktok.com');

    let postData = { success: false };
    let profileData = { success: false, followers: 0 };

    // Scrape post
    if (isInstagram) {
      postData = await scrapeInstagramPost(postUrl);
    } else if (isTikTok) {
      postData = await scrapeTikTokPost(postUrl);
    }

    // Scrape profile if provided
    if (profileUrl) {
      if (profileUrl.includes('instagram.com')) {
        profileData = await scrapeInstagramProfile(profileUrl);
      } else if (profileUrl.includes('tiktok.com')) {
        profileData = await scrapeTikTokProfile(profileUrl);
      }
    }

    const result = {
      success: postData.success,
      metrics: {
        views: postData.views || 0,
        likes: postData.likes || 0,
        comments: postData.comments || 0,
        shares: postData.shares || 0,
        saves: postData.saves || 0,
        followers: profileData.followers || 0
      },
      postedAt: postData.postedAt || null,
      title: postData.title || '',
      creator: postData.creator || '',
      image: postData.image || ''
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }]
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});
