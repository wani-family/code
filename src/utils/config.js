require('dotenv').config();
const logger = require('./logger');

// Validate required environment variables
const requiredEnvVars = [
  'IMAP_USER',
  'IMAP_PASSWORD',
  'TARGET_SENDER'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', { missingVars });
  logger.error('Please copy .env.example to .env and fill in the required values');
  process.exit(1);
}

const config = {
  imap: {
    host: process.env.IMAP_HOST || 'imap.daum.net',
    port: parseInt(process.env.IMAP_PORT) || 993,
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    tls: process.env.IMAP_TLS === 'true' || true,
    tlsOptions: { rejectUnauthorized: false }
  },
  email: {
    targetSender: process.env.TARGET_SENDER,
    mailbox: process.env.MAILBOX || 'INBOX',
    markAsRead: process.env.MARK_AS_READ === 'true' || true,
    linkPattern: process.env.LINK_PATTERN || null
  },
  github: {
    pageUrl: process.env.GITHUB_PAGE_URL || 'https://username.github.io/repo-name/'
  },
  browser: {
    headless: process.env.BROWSER_HEADLESS === 'true' || false,
    sessionDir: process.env.SESSION_DIR || './sessions'
  },
  paths: {
    tempDir: process.env.TEMP_DIR || './temp',
    logsDir: process.env.LOGS_DIR || './logs',
    sessionDir: process.env.SESSION_DIR || './sessions'
  }
};

logger.info('Configuration loaded successfully');
logger.info('Monitoring emails from:', { sender: config.email.targetSender });

module.exports = config;
