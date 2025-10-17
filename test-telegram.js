const TelegramBot = require('node-telegram-bot-api');

const token = '8027593890:AAEGT422G809RLVgvqysy1GCdhITQOcSRnc';
const chatId = '7779989691';

console.log('Testing Telegram bot connection...');

const bot = new TelegramBot(token, { polling: false });

bot.getMe()
  .then((me) => {
    console.log('✅ Bot connected successfully!');
    console.log('Bot name:', me.username);
    console.log('Bot ID:', me.id);

    return bot.sendMessage(chatId, '🧪 Test message from Netflix email service');
  })
  .then(() => {
    console.log('✅ Test message sent successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  });
