const Imap = require('imap');

const imap = new Imap({
  user: 'taewan0530@daum.net',
  password: '34635037',
  host: 'imap.daum.net',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

console.log('Testing IMAP connection...');

imap.once('ready', () => {
  console.log('✅ IMAP connection successful!');
  imap.end();
});

imap.once('error', (err) => {
  console.error('❌ IMAP connection failed:', err.message);
  process.exit(1);
});

imap.once('end', () => {
  console.log('Connection ended');
  process.exit(0);
});

imap.connect();
