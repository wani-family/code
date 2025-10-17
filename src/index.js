const logger = require('./utils/logger');
const config = require('./utils/config');
const ImapClient = require('./mail/imap-client');
const PDFGenerator = require('./browser/pdf-generator');
const GitHubPublisher = require('./github/publisher');
const fs = require('fs').promises;

class EmailToGitHubService {
  constructor() {
    this.imapClient = new ImapClient();
    this.pdfGenerator = new PDFGenerator();
    this.github = new GitHubPublisher();
    this.isRunning = false;
  }

  /**
   * Initialize all services
   */
  async start() {
    try {
      logger.info('='.repeat(60));
      logger.info('📧 Email to GitHub Pages PDF Service');
      logger.info('='.repeat(60));

      // Initialize PDF Generator
      logger.info('Initializing PDF generator...');
      await this.pdfGenerator.initialize();

      // Set up email callback
      this.imapClient.onEmail(async (emailData) => {
        await this.processEmail(emailData);
      });

      // Connect to IMAP
      logger.info('Connecting to IMAP server...');
      await this.imapClient.connect();

      this.isRunning = true;

      logger.info('='.repeat(60));
      logger.info('✅ Service started successfully!');
      logger.info(`📬 Monitoring: ${config.email.targetSender}`);
      logger.info(`📧 Mailbox: ${config.email.mailbox}`);
      logger.info(`📄 GitHub Pages: ${this.github.getPageUrl()}`);
      logger.info('⏳ Waiting for emails...');
      logger.info('='.repeat(60));

    } catch (error) {
      logger.error('Failed to start service:', { error: error.message });
      throw error;
    }
  }

  /**
   * Process received email
   * @param {object} emailData - Email data with link and metadata
   */
  async processEmail(emailData) {
    const { link, metadata, seqno } = emailData;

    try {
      logger.info('='.repeat(60));
      logger.info('📨 Processing new email');
      logger.info(`From: ${metadata.sender}`);
      logger.info(`Subject: ${metadata.subject}`);
      logger.info(`Link: ${link}`);
      logger.info('='.repeat(60));

      // Generate PDF
      logger.info('Generating PDF from link...');
      const pdfPath = await this.pdfGenerator.generatePDF(link);

      // Publish to GitHub Pages
      logger.info('Publishing PDF to GitHub Pages...');
      await this.github.publishPDF(pdfPath, {
        sender: metadata.sender,
        subject: metadata.subject,
        link: link
      });

      // Clean up temporary PDF file
      logger.info('Cleaning up temporary file...');
      await fs.unlink(pdfPath);

      logger.info('='.repeat(60));
      logger.info('✅ Email processed successfully!');
      logger.info('='.repeat(60));

      // Clean up old PDFs (older than 24 hours)
      await this.pdfGenerator.cleanupOldPDFs(24);

    } catch (error) {
      logger.error('Error processing email:', {
        error: error.message,
        stack: error.stack,
        link,
        seqno
      });
    }
  }

  /**
   * Stop the service gracefully
   */
  async stop() {
    try {
      logger.info('Stopping service...');

      this.isRunning = false;

      // Disconnect IMAP
      this.imapClient.disconnect();

      // Close browser
      await this.pdfGenerator.close();

      logger.info('Service stopped successfully');

    } catch (error) {
      logger.error('Error stopping service:', { error: error.message });
    }
  }
}

// Create service instance
const service = new EmailToGitHubService();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await service.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await service.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
});

// Start the service
service.start().catch(async (error) => {
  logger.error('Fatal error:', { error: error.message });
  process.exit(1);
});

// Add manual check feature with readline
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Listen for Enter key to manually check for new emails
rl.on('line', () => {
  logger.info('📬 Manual check triggered - Checking for new emails...');
  service.imapClient.fetchNewEmails();
});
