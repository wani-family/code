const axios = require('axios');

const token = '8027593890:AAEGT422G809RLVgvqysy1GCdhITQOcSRnc';
const chatId = '7779989691';
const baseURL = `https://api.telegram.org/bot${token}`;

console.log('Testing Telegram bot with axios...');

async function test() {
  try {
    // Test getMe
    console.log('1. Testing getMe...');
    const meResponse = await axios.get(`${baseURL}/getMe`);
    console.log('✅ getMe successful:', meResponse.data.result.username);

    // Test sendMessage
    console.log('2. Testing sendMessage...');
    const msgResponse = await axios.post(`${baseURL}/sendMessage`, {
      chat_id: chatId,
      text: '🧪 Axios test message!'
    });
    console.log('✅ sendMessage successful!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Full error:', error);
    process.exit(1);
  }
}

test();
