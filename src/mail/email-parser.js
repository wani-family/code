const { simpleParser } = require('mailparser');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Parse email buffer to structured data
 * @param {Buffer} emailBuffer - Raw email data
 * @returns {object} - Parsed email object
 */
async function parseEmail(emailBuffer) {
  try {
    const parsed = await simpleParser(emailBuffer);

    const email = {
      from: parsed.from?.text || parsed.from?.value?.[0]?.address || 'unknown',
      to: parsed.to?.text || '',
      subject: parsed.subject || '(no subject)',
      date: parsed.date || new Date(),
      text: parsed.text || '',
      html: parsed.html || '',
      attachments: parsed.attachments || []
    };

    logger.info('Email parsed successfully', {
      from: email.from,
      subject: email.subject,
      hasHtml: !!email.html,
      hasText: !!email.text
    });

    return email;

  } catch (error) {
    logger.error('Error parsing email:', { error: error.message });
    throw error;
  }
}

/**
 * Check if email is from target sender
 * @param {object} email - Parsed email object
 * @returns {boolean} - True if from target sender
 */
function isFromTargetSender(email) {
  const targetSender = config.email.targetSender.toLowerCase();
  const emailFrom = email.from.toLowerCase();

  // Check if target sender is in the from field
  const isMatch = emailFrom.includes(targetSender);

  if (isMatch) {
    logger.info('Email from target sender detected', {
      from: email.from,
      target: config.email.targetSender
    });
  } else {
    logger.debug('Email not from target sender', {
      from: email.from,
      target: config.email.targetSender
    });
  }

  return isMatch;
}

/**
 * Extract email metadata
 * @param {object} email - Parsed email object
 * @returns {object} - Email metadata
 */
function getEmailMetadata(email) {
  return {
    sender: email.from,
    subject: email.subject,
    date: email.date,
    preview: email.text ? email.text.substring(0, 100) + '...' : ''
  };
}

module.exports = {
  parseEmail,
  isFromTargetSender,
  getEmailMetadata
};
