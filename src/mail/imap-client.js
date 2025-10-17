const Imap = require('imap');
const { parseEmail, isFromTargetSender, getEmailMetadata } = require('./email-parser');
const { extractLink } = require('./link-extractor');
const logger = require('../utils/logger');
const config = require('../utils/config');

class ImapClient {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.onEmailCallback = null;
  }

  /**
   * Initialize IMAP connection
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Connecting to IMAP server...', {
          host: config.imap.host,
          port: config.imap.port,
          user: config.imap.user
        });

        this.imap = new Imap({
          user: config.imap.user,
          password: config.imap.password,
          host: config.imap.host,
          port: config.imap.port,
          tls: config.imap.tls,
          tlsOptions: config.imap.tlsOptions,
          keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true
          }
        });

        // Connection ready
        this.imap.once('ready', () => {
          logger.info('IMAP connection established');
          this.isConnected = true;
          this.openInbox(resolve, reject);
        });

        // Connection error
        this.imap.once('error', (err) => {
          logger.error('IMAP connection error:', { error: err.message });
          this.isConnected = false;
          reject(err);
        });

        // Connection ended
        this.imap.once('end', () => {
          logger.warn('IMAP connection ended');
          this.isConnected = false;
          this.scheduleReconnect();
        });

        // Connection closed
        this.imap.once('close', () => {
          logger.warn('IMAP connection closed');
          this.isConnected = false;
        });

        // Start connection
        this.imap.connect();

      } catch (error) {
        logger.error('Failed to initialize IMAP client:', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Open inbox and start listening
   */
  openInbox(resolve, reject) {
    this.imap.openBox(config.email.mailbox, false, (err, box) => {
      if (err) {
        logger.error('Failed to open mailbox:', { error: err.message });
        reject(err);
        return;
      }

      logger.info('Mailbox opened successfully', {
        mailbox: config.email.mailbox,
        totalMessages: box.messages.total,
        newMessages: box.messages.new
      });

      // Listen for new mail
      this.imap.on('mail', (numNewMsgs) => {
        logger.info(`New mail notification: ${numNewMsgs} new message(s)`);
        this.fetchNewEmails();
      });

      // Try to start IDLE mode explicitly
      try {
        logger.info('Attempting to enter IDLE mode...');
        this.imap.on('ready', () => {
          logger.info('IMAP is ready, connection should support IDLE');
        });

        // The imap library automatically handles IDLE with keepalive settings
        // But we can check if connection is alive
        logger.info('IDLE mode enabled via keepalive configuration');
        logger.info('Waiting for new mail notifications...');
      } catch (error) {
        logger.warn('Could not explicitly enter IDLE mode:', { error: error.message });
      }

      resolve();
    });
  }

  /**
   * Fetch new unread emails
   */
  async fetchNewEmails() {
    try {
      logger.info('Fetching new emails from target sender...');

      // Search for UNSEEN emails from target sender only
      this.imap.search([
        'UNSEEN',
        ['FROM', config.email.targetSender]
      ], (err, results) => {
        if (err) {
          logger.error('Error searching for emails:', { error: err.message });
          return;
        }

        if (!results || results.length === 0) {
          logger.info('No new unread emails from target sender');
          return;
        }

        logger.info(`Found ${results.length} unread email(s) from target sender`);

        // Only process the latest 1 email
        const latestResults = results.slice(-1);
        logger.info(`Processing latest ${latestResults.length} email(s)`);

        // Track if we've already processed one email from target sender
        let processedTargetEmail = false;

        const fetch = this.imap.fetch(latestResults, {
          bodies: '',
          markSeen: false
        });

        fetch.on('message', (msg, seqno) => {
          logger.info(`Processing email #${seqno}`);

          let buffer = '';

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('end', async () => {
            try {
              // Parse email
              const email = await parseEmail(buffer);

              // Check if from target sender
              if (!isFromTargetSender(email)) {
                logger.info('Email not from target sender, skipping', {
                  from: email.from
                });
                return;
              }

              // Only process the first email from target sender
              if (processedTargetEmail) {
                logger.info('Already processed one email from target sender, skipping', {
                  from: email.from,
                  seqno
                });
                return;
              }

              processedTargetEmail = true;

              // Extract link
              const linkOptions = config.email.linkPattern
                ? { pattern: config.email.linkPattern }
                : {};
              const link = extractLink(email.html, linkOptions);

              if (!link) {
                logger.warn('No link found in email', {
                  from: email.from,
                  subject: email.subject
                });
                return;
              }

              // Get metadata
              const metadata = getEmailMetadata(email);

              // Call callback with email data
              if (this.onEmailCallback) {
                await this.onEmailCallback({
                  link,
                  metadata,
                  seqno
                });
              }

              // Mark as read if configured
              if (config.email.markAsRead) {
                this.markAsRead(seqno);
              }

            } catch (error) {
              logger.error('Error processing email:', {
                error: error.message,
                seqno
              });
            }
          });
        });

        fetch.once('error', (err) => {
          logger.error('Fetch error:', { error: err.message });
        });

        fetch.once('end', () => {
          logger.info('Email fetch completed');
        });
      });

    } catch (error) {
      logger.error('Error fetching new emails:', { error: error.message });
    }
  }

  /**
   * Mark email as read
   * @param {number} seqno - Email sequence number
   */
  markAsRead(seqno) {
    try {
      this.imap.addFlags(seqno, ['\\Seen'], (err) => {
        if (err) {
          logger.error('Error marking email as read:', { error: err.message, seqno });
        } else {
          logger.info('Email marked as read', { seqno });
        }
      });
    } catch (error) {
      logger.error('Error in markAsRead:', { error: error.message });
    }
  }

  /**
   * Set callback for new emails
   * @param {function} callback - Callback function
   */
  onEmail(callback) {
    this.onEmailCallback = callback;
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    logger.info('Scheduling reconnection in 5 seconds...');

    this.reconnectTimer = setTimeout(async () => {
      try {
        logger.info('Attempting to reconnect...');
        await this.connect();
      } catch (error) {
        logger.error('Reconnection failed:', { error: error.message });
        this.scheduleReconnect();
      }
    }, 5000);
  }

  /**
   * Disconnect from IMAP server
   */
  disconnect() {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }

      if (this.imap) {
        this.imap.end();
        logger.info('IMAP client disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting:', { error: error.message });
    }
  }
}

module.exports = ImapClient;
