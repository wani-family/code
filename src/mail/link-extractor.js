const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Extract links from email HTML content
 * @param {string} html - Email HTML content
 * @param {object} options - Extraction options
 * @returns {string|null} - First matching link or null
 */
function extractLink(html, options = {}) {
  try {
    if (!html) {
      logger.warn('No HTML content provided for link extraction');
      return null;
    }

    const $ = cheerio.load(html);
    const links = [];

    // Extract all links from <a> tags
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.startsWith('http')) {
        links.push(href);
      }
    });

    if (links.length === 0) {
      logger.warn('No links found in email HTML');
      return null;
    }

    logger.info(`Found ${links.length} link(s) in email`, { links });

    // Apply filters if specified
    if (options.domain) {
      const filtered = links.filter(link => link.includes(options.domain));
      if (filtered.length > 0) {
        logger.info('Filtered link by domain:', { domain: options.domain, link: filtered[0] });
        return filtered[0];
      }
    }

    if (options.pattern) {
      const regex = new RegExp(options.pattern);
      const filtered = links.filter(link => regex.test(link));
      if (filtered.length > 0) {
        logger.info('Filtered link by pattern:', { pattern: options.pattern, link: filtered[0] });
        return filtered[0];
      }
    }

    // Return first link by default
    logger.info('Returning first link:', { link: links[0] });
    return links[0];

  } catch (error) {
    logger.error('Error extracting link from HTML:', { error: error.message });
    return null;
  }
}

/**
 * Extract all links from email HTML content
 * @param {string} html - Email HTML content
 * @returns {array} - Array of links
 */
function extractAllLinks(html) {
  try {
    if (!html) return [];

    const $ = cheerio.load(html);
    const links = [];

    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.startsWith('http')) {
        links.push(href);
      }
    });

    return links;

  } catch (error) {
    logger.error('Error extracting all links:', { error: error.message });
    return [];
  }
}

module.exports = {
  extractLink,
  extractAllLinks
};
