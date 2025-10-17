const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const config = require('../utils/config');

class PDFGenerator {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  /**
   * Initialize browser with persistent session
   */
  async initialize() {
    try {
      const sessionPath = path.resolve(config.browser.sessionDir);

      // Ensure session directory exists
      await fs.mkdir(sessionPath, { recursive: true });

      logger.info('Launching browser with persistent context', {
        sessionPath,
        headless: config.browser.headless
      });

      // Launch browser with persistent context to save login sessions
      this.context = await chromium.launchPersistentContext(sessionPath, {
        headless: config.browser.headless,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        acceptDownloads: true,
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
      });

      logger.info('Browser initialized successfully');

      // If not headless, show message for manual login and open a blank page
      if (!config.browser.headless) {
        logger.info('⚠️  Browser is running in headed mode for manual login');
        logger.info('⚠️  If you need to login to any sites, do it now');
        logger.info('⚠️  Sessions will be saved and reused automatically');

        // Open a blank page to keep browser window visible
        const page = await this.context.newPage();
        await page.goto('about:blank');
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize browser:', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate PDF from URL
   * @param {string} url - URL to convert to PDF
   * @param {object} options - Generation options
   * @returns {string} - Path to generated PDF
   */
  async generatePDF(url, options = {}) {
    try {
      // Ensure browser is initialized
      if (!this.context) {
        await this.initialize();
      }

      const page = await this.context.newPage();

      logger.info('Navigating to URL:', { url });

      // Navigate to URL with timeout
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Wait a bit for any dynamic content to load
      await page.waitForTimeout(2000);

      // Optional: Wait for specific selector if provided
      if (options.waitForSelector) {
        logger.info('Waiting for selector:', { selector: options.waitForSelector });
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const fileName = `${sanitizedUrl}_${timestamp}.pdf`;
      const pdfPath = path.join(config.paths.tempDir, fileName);

      // Ensure temp directory exists
      await fs.mkdir(config.paths.tempDir, { recursive: true });

      logger.info('Generating PDF...', { fileName });

      // Generate PDF
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      // Get file size
      const stats = await fs.stat(pdfPath);
      logger.info('PDF generated successfully', {
        path: pdfPath,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
      });

      // Close the page
      await page.close();

      return pdfPath;

    } catch (error) {
      logger.error('Failed to generate PDF:', {
        error: error.message,
        url
      });
      throw error;
    }
  }

  /**
   * Close browser and cleanup
   */
  async close() {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
        logger.info('Browser closed successfully');
      }
    } catch (error) {
      logger.error('Error closing browser:', { error: error.message });
    }
  }

  /**
   * Clean up old PDF files
   * @param {number} maxAgeHours - Maximum age in hours (default 24)
   */
  async cleanupOldPDFs(maxAgeHours = 24) {
    try {
      const tempDir = config.paths.tempDir;
      const files = await fs.readdir(tempDir);

      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.pdf')) continue;

        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info('Deleted old PDF:', { file });
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old PDF file(s)`);
      }

    } catch (error) {
      logger.error('Error cleaning up old PDFs:', { error: error.message });
    }
  }
}

module.exports = PDFGenerator;
