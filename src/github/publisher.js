const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const config = require('../utils/config');

const execAsync = promisify(exec);

class GitHubPublisher {
  constructor() {
    this.docsDir = path.join(process.cwd(), 'docs');
    this.pdfsDir = path.join(this.docsDir, 'pdfs');
    this.pdfsJsonPath = path.join(this.docsDir, 'pdfs.json');
    this.maxPdfs = 3;
  }

  /**
   * Publish PDF to GitHub Pages
   * @param {string} pdfPath - Path to PDF file
   * @param {object} metadata - Email metadata
   */
  async publishPDF(pdfPath, metadata = {}) {
    try {
      logger.info('Publishing PDF to GitHub Pages...');

      // Generate filename with timestamp
      const timestamp = new Date();
      const filename = this.generateFilename(timestamp);
      const destPath = path.join(this.pdfsDir, filename);

      // Copy PDF to docs/pdfs/
      await fs.copyFile(pdfPath, destPath);
      logger.info('PDF copied to docs/pdfs/', { filename });

      // Update pdfs.json
      await this.updatePdfsJson(filename, timestamp, metadata);

      // Git commit and push
      await this.gitCommitAndPush(filename, metadata);

      logger.info('PDF published successfully to GitHub Pages');
      return true;

    } catch (error) {
      logger.error('Failed to publish PDF:', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate filename with timestamp
   * @param {Date} date - Date object
   * @returns {string} - Filename
   */
  generateFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}${minutes}${seconds}.pdf`;
  }

  /**
   * Update pdfs.json with new PDF
   * @param {string} filename - PDF filename
   * @param {Date} timestamp - Timestamp
   * @param {object} metadata - Email metadata
   */
  async updatePdfsJson(filename, timestamp, metadata) {
    try {
      // Read current pdfs.json
      let data = { pdfs: [], lastUpdate: null };
      try {
        const content = await fs.readFile(this.pdfsJsonPath, 'utf8');
        data = JSON.parse(content);
      } catch (error) {
        logger.warn('pdfs.json not found, creating new one');
      }

      // Format date and time
      const dateStr = timestamp.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = timestamp.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Add new PDF to the beginning of the list
      data.pdfs.unshift({
        filename,
        date: dateStr,
        time: timeStr,
        timestamp: timestamp.toISOString(),
        sender: metadata.sender || 'Unknown',
        subject: metadata.subject || 'No Subject'
      });

      // Keep only the latest 3 PDFs
      if (data.pdfs.length > this.maxPdfs) {
        const removed = data.pdfs.splice(this.maxPdfs);

        // Delete old PDF files
        for (const pdf of removed) {
          const oldPath = path.join(this.pdfsDir, pdf.filename);
          try {
            await fs.unlink(oldPath);
            logger.info('Deleted old PDF:', { filename: pdf.filename });
          } catch (error) {
            logger.warn('Failed to delete old PDF:', { filename: pdf.filename });
          }
        }
      }

      // Update lastUpdate
      data.lastUpdate = timestamp.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul'
      });

      // Write updated pdfs.json
      await fs.writeFile(
        this.pdfsJsonPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      logger.info('pdfs.json updated', { totalPdfs: data.pdfs.length });

    } catch (error) {
      logger.error('Failed to update pdfs.json:', { error: error.message });
      throw error;
    }
  }

  /**
   * Git commit and push
   * @param {string} filename - PDF filename
   * @param {object} metadata - Email metadata
   */
  async gitCommitAndPush(filename, metadata) {
    try {
      logger.info('Committing and pushing to GitHub...');

      // Git add
      await execAsync('git add docs/');
      logger.info('Git add completed');

      // Git commit
      const commitMessage = `Add Netflix PDF: ${filename}

From: ${metadata.sender || 'Unknown'}
Subject: ${metadata.subject || 'No Subject'}

Auto-generated commit from email monitoring service`;

      await execAsync(`git commit -m "${commitMessage}"`);
      logger.info('Git commit completed');

      // Git push
      await execAsync('git push');
      logger.info('Git push completed');

    } catch (error) {
      // If no changes to commit, it's not an error
      if (error.message.includes('nothing to commit')) {
        logger.info('No changes to commit');
        return;
      }

      logger.error('Git operation failed:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get GitHub Pages URL
   * @returns {string} - GitHub Pages URL
   */
  getPageUrl() {
    // This should be configured based on your GitHub username and repo name
    // Example: https://username.github.io/repo-name/
    return config.github?.pageUrl || 'Configure GitHub Pages URL in .env';
  }
}

module.exports = GitHubPublisher;
