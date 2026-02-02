import express from 'express';
import cors from 'cors';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const puppeteer = puppeteerExtra.default || puppeteerExtra;
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

let browser = null;

// Initialize browser with anti-detection measures
async function getBrowser() {
  try {
    if (!browser || !browser.isConnected()) {
      if (browser) {
        try { await browser.close(); } catch (e) {}
      }
      console.log('Launching new browser...');
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080',
          '--single-process',
          '--no-zygote'
        ]
      });
      console.log('Browser launched successfully');
    }
    return browser;
  } catch (error) {
    console.error('Browser launch error:', error.message);
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
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Override webdriver detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });
}

// Scrape Instagram post
async function scrapeInstagramPost(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await setupPage(page);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Close login modal if it appears
    try {
      await page.waitForSelector('svg[aria-label="Close"]', { timeout: 3000 });
      await page.click('svg[aria-label="Close"]');
      await page.waitForTimeout(500);
    } catch (e) {
      // Modal didn't appear, continue
    }

    // Extract metrics
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

      // Instagram shows metrics on separate lines like:
      // "2.3M" (likes)
      // "4.2K" (comments)
      // We need to avoid matching video duration like "01h46m"

      // Look for standalone metrics (not part of time like "01h46m")
      // Pattern: number with M/K suffix, but NOT preceded by 'h' (hours)
      const lines = text.split('\n');
      const metricLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // Match lines that are just a metric like "2.3M" or "4.2K"
        if (/^(\d+\.?\d*[MK])$/i.test(trimmed)) {
          metricLines.push(trimmed);
        }
      }

      // First metric is likes (usually bigger, with M)
      // Second metric is comments (usually smaller, with K)
      if (metricLines.length >= 1) {
        result.likes = metricLines[0];
      }
      if (metricLines.length >= 2) {
        result.comments = metricLines[1];
      }

      // Fallback: look for "X likes" pattern
      const likesMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*likes?/i);
      if (likesMatch && !result.likes) {
        result.likes = likesMatch[1];
      }

      // Fallback: look for "X comments" pattern
      const commentsMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*comments?/i);
      if (commentsMatch && !result.comments) {
        result.comments = commentsMatch[1];
      }

      // Look for views (reels)
      const viewsMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*(?:views?|plays?)/i);
      if (viewsMatch) result.views = viewsMatch[1];

      // Get date
      const timeEl = document.querySelector('time');
      if (timeEl) {
        result.postedAt = timeEl.getAttribute('datetime') || timeEl.innerText;
      }

      // Get creator username
      const creatorEl = document.querySelector('a[href*="/"] span') ||
                        document.querySelector('header a');
      if (creatorEl) result.creator = creatorEl.innerText;

      // Get image
      const imgEl = document.querySelector('article img') ||
                    document.querySelector('video[poster]');
      if (imgEl) {
        result.image = imgEl.src || imgEl.poster;
      }

      // Get title/caption
      const captionEl = document.querySelector('h1') ||
                        document.querySelector('span[dir="auto"]');
      if (captionEl) result.title = captionEl.innerText?.slice(0, 100);

      return result;
    });

    // Capture screenshot of the post image/video
    let imageBase64 = '';
    try {
      // Try to find the video or image element
      const mediaElement = await page.$('article video, article img, div[role="button"] img');
      if (mediaElement) {
        const screenshot = await mediaElement.screenshot({ encoding: 'base64' });
        imageBase64 = `data:image/png;base64,${screenshot}`;
      } else {
        // Fallback: screenshot the main post area
        const postArea = await page.$('article') || await page.$('main');
        if (postArea) {
          const screenshot = await postArea.screenshot({ encoding: 'base64' });
          imageBase64 = `data:image/png;base64,${screenshot}`;
        }
      }
    } catch (screenshotError) {
      console.log('Screenshot capture failed:', screenshotError.message);
    }

    return {
      success: true,
      likes: parseMetric(metrics.likes),
      comments: parseMetric(metrics.comments),
      views: parseMetric(metrics.views),
      postedAt: metrics.postedAt,
      title: metrics.title,
      creator: metrics.creator,
      image: imageBase64 || metrics.image
    };
  } catch (error) {
    console.error('Instagram post scrape error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await page.close();
  }
}

// Scrape Instagram profile
async function scrapeInstagramProfile(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await setupPage(page);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Close login modal if it appears
    try {
      await page.waitForSelector('svg[aria-label="Close"]', { timeout: 3000 });
      await page.click('svg[aria-label="Close"]');
      await page.waitForTimeout(500);
    } catch (e) {
      // Modal didn't appear
    }

    const metrics = await page.evaluate(() => {
      const text = document.body.innerText;

      // Look for followers
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
    console.error('Instagram profile scrape error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await page.close();
  }
}

// Scrape TikTok post
async function scrapeTikTokPost(url) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await setupPage(page);

    // Navigate with longer timeout
    console.log('Navigating to TikTok:', url);

    // Use load instead of domcontentloaded for more stability
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });

    // Wait for page to fully stabilize
    await new Promise(r => setTimeout(r, 5000));

    // Check if page is still valid
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

    // Wait a bit more for content
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
        image: '',
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

      // Also try to find metrics from page text as fallback
      if (!result.likes) {
        const text = document.body.innerText;
        // Look for patterns like "123.4K" near "likes"
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
        // Relative time at start of text: 1w ago, 3d ago, 5h ago
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

    console.log('TikTok metrics found:', metrics);

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
        // Fallback: screenshot the main content area
        const mainArea = await page.$('[data-e2e="browse-video-container"]') ||
                         await page.$('[class*="DivContentContainer"]') ||
                         await page.$('main');
        if (mainArea) {
          const screenshot = await mainArea.screenshot({ encoding: 'base64' });
          imageBase64 = `data:image/png;base64,${screenshot}`;
        }
      }
    } catch (screenshotError) {
      console.log('TikTok screenshot failed:', screenshotError.message);
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
    console.error('TikTok post scrape error:', error.message);
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
    await setupPage(page);
    console.log('Navigating to TikTok profile:', url);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });

    // Wait for page to stabilize
    await new Promise(r => setTimeout(r, 5000));

    // Check if page is still valid
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
      // Try specific selectors first
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

      // Fallback to text matching
      const text = document.body.innerText;
      const followersMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Followers/i);

      return {
        followers: followersMatch ? followersMatch[1] : '0'
      };
    });

    console.log('TikTok profile followers:', metrics.followers);

    return {
      success: true,
      followers: parseMetric(metrics.followers)
    };
  } catch (error) {
    console.error('TikTok profile scrape error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
  }
}

// API endpoint to scrape metrics
app.post('/api/scrape', async (req, res) => {
  try {
    const { postUrl, profileUrl } = req.body;

    if (!postUrl) {
      return res.status(400).json({ error: 'postUrl is required' });
    }

    console.log('Scraping:', { postUrl, profileUrl });

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

  // Combine results
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

    console.log('Result:', result);
    res.json(result);
  } catch (error) {
    console.error('Scrape endpoint error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Metrics scraper running on port ${PORT}`);
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});
