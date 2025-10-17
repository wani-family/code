const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const logger = require('../utils/logger');
const config = require('../utils/config');

class TelegramService {
  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.baseURL = `https://api.telegram.org/bot${this.botToken}`;

    // Create axios instance with IPv4 only
    this.axiosInstance = axios.create({
      httpAgent: new http.Agent({ family: 4 }),
      httpsAgent: new https.Agent({ family: 4 })
    });
  }

  /**
   * Initialize and verify bot connection
   */
  async initialize() {
    try {
      const response = await this.axiosInstance.get(`${this.baseURL}/getMe`);
      const me = response.data.result;

      logger.info('Telegram bot connected successfully', {
        botName: me.username,
        botId: me.id
      });

      // Send startup notification
      await this.sendMessage('🤖 Email monitoring service started!\nWaiting for emails...');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Telegram bot:', { error: error.message });
      throw error;
    }
  }

  /**
   * Send a text message
   * @param {string} message - Message to send
   */
  async sendMessage(message) {
    try {
      await this.axiosInstance.post(`${this.baseURL}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      logger.info('Telegram message sent', { message: message.substring(0, 50) });
    } catch (error) {
      logger.error('Failed to send Telegram message:', { error: error.message });
      throw error;
    }
  }

  /**
   * Send a PDF file
   * @param {string} pdfPath - Path to PDF file
   * @param {object} metadata - Additional metadata (sender, subject, link)
   */
  async sendPDF(pdfPath, metadata = {}) {
    try {
      // Check if file exists
      await fs.promises.access(pdfPath);

      const fileName = path.basename(pdfPath);
      const fileStats = await fs.promises.stat(pdfPath);

      logger.info('Sending PDF to Telegram', {
        fileName,
        fileSize: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`
      });

      // Prepare caption with metadata (decode HTML entities in link)
      const decodeHtml = (html) => {
        return html
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      };

      let caption = '📄 Netflix Email PDF\n\n';
      if (metadata.sender) {
        caption += `From: ${metadata.sender}\n`;
      }
      if (metadata.subject) {
        caption += `Subject: ${metadata.subject}\n`;
      }
      caption += `\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

      // Create form data
      const formData = new FormData();
      formData.append('chat_id', this.chatId);
      formData.append('document', fs.createReadStream(pdfPath), {
        filename: fileName,
        contentType: 'application/pdf'
      });
      formData.append('caption', caption);

      // Send PDF document
      await this.axiosInstance.post(`${this.baseURL}/sendDocument`, formData, {
        headers: formData.getHeaders()
      });

      logger.info('PDF sent successfully to Telegram', { fileName });
      return true;

    } catch (error) {
      logger.error('Failed to send PDF to Telegram:', {
        error: error.message,
        pdfPath
      });
      throw error;
    }
  }

  /**
   * Send error notification
   * @param {string} errorMessage - Error message
   * @param {object} context - Additional context
   */
  async sendError(errorMessage, context = {}) {
    try {
      let message = '❌ <b>Error Occurred</b>\n\n';
      message += `${errorMessage}\n\n`;

      if (Object.keys(context).length > 0) {
        message += '<b>Context:</b>\n';
        message += '<code>' + JSON.stringify(context, null, 2) + '</code>';
      }

      await this.sendMessage(message);
    } catch (error) {
      logger.error('Failed to send error notification:', { error: error.message });
    }
  }

  /**
   * Send processing notification
   * @param {string} status - Processing status
   */
  async sendProcessing(status) {
    try {
      const message = `⏳ <b>Processing Email</b>\n\n${status}`;
      await this.sendMessage(message);
    } catch (error) {
      logger.error('Failed to send processing notification:', { error: error.message });
    }
  }
}

module.exports = TelegramService;
