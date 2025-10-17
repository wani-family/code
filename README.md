# 📧 Email to Telegram PDF Service

실시간으로 Daum 메일을 모니터링하여 특정 발신자의 메일에서 링크를 추출하고, 해당 웹페이지를 PDF로 변환하여 텔레그램으로 전송하는 자동화 서비스입니다.

## ✨ 주요 기능

- 🔔 **실시간 이메일 알림**: IMAP IDLE을 사용한 즉각적인 메일 감지 (1-2초 이내)
- 🎯 **발신자 필터링**: 특정 발신자의 메일만 처리
- 🔗 **링크 자동 추출**: 메일 본문에서 링크 자동 추출
- 📄 **PDF 생성**: Playwright를 사용한 고품질 PDF 변환
- 🔐 **세션 유지**: 브라우저 로그인 상태 자동 저장 및 재사용
- 📱 **텔레그램 전송**: 생성된 PDF를 텔레그램으로 즉시 전송
- 🔄 **자동 재연결**: IMAP 연결 끊김 시 자동 재연결
- 📊 **상세 로깅**: Winston을 사용한 체계적인 로그 관리

## 🏗️ 시스템 구조

```
[Daum 메일]
    ↓ (IMAP IDLE - 실시간)
[Node.js IMAP 클라이언트]
    ↓ (새 메일 이벤트)
[발신자 필터링]
    ↓ (TARGET_SENDER 확인)
[링크 추출]
    ↓ (HTML 파싱)
[Playwright - 브라우저]
    ↓ (세션 유지)
[웹페이지 → PDF 변환]
    ↓
[Telegram Bot API]
    ↓
[PDF 전송 완료]
```

## 📋 사전 준비

### 1. Daum 메일 IMAP 설정

1. [Daum 메일](https://mail.daum.net)에 로그인
2. **설정** → **메일 연동 설정** → **IMAP/SMTP 사용 설정**
3. IMAP/SMTP 사용 활성화

### 2. Telegram Bot 생성

1. Telegram에서 [@BotFather](https://t.me/BotFather) 검색
2. `/newbot` 명령어 입력
3. 봇 이름 및 username 설정
4. 발급받은 **Bot Token** 저장 (예: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. Telegram Chat ID 확인

1. [@userinfobot](https://t.me/userinfobot) 검색
2. `/start` 명령어 입력
3. 표시되는 **Chat ID** 저장 (예: `123456789`)

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 의존성 설치 (이미 완료됨)
npm install
```

### 2. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일을 열어 다음 정보 입력:

```bash
# Daum 메일 정보
IMAP_USER=your-email@daum.net
IMAP_PASSWORD=your-password
TARGET_SENDER=sender@example.com  # 모니터링할 발신자 이메일

# Telegram Bot 정보
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-chat-id

# 브라우저 설정 (첫 실행은 false로)
BROWSER_HEADLESS=false
```

### 3. 서비스 시작

```bash
npm start
```

### 4. 첫 실행 시 로그인

- `BROWSER_HEADLESS=false`로 설정한 경우 브라우저 창이 열립니다
- 메일에서 링크를 받았을 때, 해당 사이트에 **수동으로 로그인**하세요
- 로그인 정보는 `./sessions/` 디렉토리에 자동 저장됩니다
- 다음 실행부터는 자동으로 로그인 상태가 유지됩니다
- 이후 `BROWSER_HEADLESS=true`로 변경하여 백그라운드 실행 가능

## 📁 프로젝트 구조

```
netflix/
├── src/
│   ├── index.js                 # 메인 진입점
│   ├── mail/
│   │   ├── imap-client.js       # IMAP IDLE 클라이언트
│   │   ├── email-parser.js      # 이메일 파싱
│   │   └── link-extractor.js    # 링크 추출
│   ├── browser/
│   │   └── pdf-generator.js     # PDF 생성
│   ├── telegram/
│   │   └── bot.js               # Telegram Bot
│   └── utils/
│       ├── logger.js            # 로깅
│       └── config.js            # 설정 관리
├── sessions/                     # 브라우저 세션 저장
├── temp/                         # 임시 PDF 파일
├── logs/                         # 로그 파일
│   ├── combined.log             # 전체 로그
│   └── error.log                # 에러 로그
├── .env                          # 환경 변수 (직접 생성)
├── .env.example                  # 환경 변수 템플릿
└── package.json
```

## 🔧 설정 옵션

### 환경 변수 전체 목록

```bash
# IMAP 설정
IMAP_HOST=imap.daum.net          # IMAP 서버 (기본값)
IMAP_PORT=993                     # IMAP 포트 (기본값)
IMAP_USER=your-email@daum.net
IMAP_PASSWORD=your-password
IMAP_TLS=true                     # TLS 사용 여부

# 이메일 필터링
TARGET_SENDER=sender@example.com  # 처리할 발신자 이메일
MAILBOX=INBOX                     # 모니터링할 메일함 (기본값)
MARK_AS_READ=true                 # 처리 후 읽음 표시 여부

# Telegram 설정
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_CHAT_ID=your-chat-id

# 브라우저 설정
BROWSER_HEADLESS=false            # false: 브라우저 표시, true: 백그라운드
SESSION_DIR=./sessions            # 세션 저장 경로

# 애플리케이션 설정
LOG_LEVEL=info                    # 로그 레벨 (debug, info, warn, error)
TEMP_DIR=./temp                   # 임시 파일 경로
LOGS_DIR=./logs                   # 로그 파일 경로
```

## 📝 사용 예시

### 1. 기본 사용법

1. 서비스 시작: `npm start`
2. 지정한 발신자가 메일 발송
3. 메일에 링크가 포함되어 있으면 자동으로 PDF 생성
4. 텔레그램으로 PDF 전송

### 2. 백그라운드 실행 (PM2 사용)

```bash
# PM2 설치
npm install -g pm2

# 서비스 시작
pm2 start src/index.js --name email-to-telegram

# 상태 확인
pm2 status

# 로그 확인
pm2 logs email-to-telegram

# 서비스 중지
pm2 stop email-to-telegram

# 서비스 재시작
pm2 restart email-to-telegram

# 부팅 시 자동 시작
pm2 startup
pm2 save
```

## 🔍 로그 확인

### 콘솔 로그
```bash
npm start
```

### 파일 로그
```bash
# 전체 로그
tail -f logs/combined.log

# 에러 로그만
tail -f logs/error.log
```

### 로그 예시
```
2024-01-01 12:00:00 info: Configuration loaded successfully
2024-01-01 12:00:01 info: Telegram bot connected successfully
2024-01-01 12:00:02 info: Browser initialized successfully
2024-01-01 12:00:03 info: IMAP connection established
2024-01-01 12:00:04 info: ✅ Service started successfully!
2024-01-01 12:00:05 info: ⏳ Waiting for emails...
```

## 🛠️ 문제 해결

### IMAP 연결 실패
```bash
# 에러: Connection refused
# 해결: Daum 메일 설정에서 IMAP 활성화 확인
```

### Telegram Bot 연결 실패
```bash
# 에러: ETELEGRAM: 401 Unauthorized
# 해결: TELEGRAM_BOT_TOKEN이 올바른지 확인
```

### PDF 생성 실패
```bash
# 에러: Navigation timeout
# 해결:
# 1. 네트워크 연결 확인
# 2. 웹사이트가 정상적으로 접근 가능한지 확인
# 3. Playwright 브라우저 재설치: npx playwright install chromium
```

### 세션이 저장되지 않음
```bash
# 해결:
# 1. sessions/ 디렉토리 권한 확인
# 2. BROWSER_HEADLESS=false로 설정하고 수동 로그인
# 3. 브라우저를 너무 빨리 닫지 않기
```

## 🔒 보안 주의사항

1. **`.env` 파일 보안**
   - `.env` 파일은 절대 Git에 커밋하지 마세요
   - 민감한 정보(비밀번호, 토큰)가 포함되어 있습니다

2. **Daum 메일 앱 비밀번호**
   - 2단계 인증 사용 시 앱 비밀번호 발급 필요
   - Daum 메일 설정 → 보안 → 앱 비밀번호

3. **세션 파일 보안**
   - `sessions/` 디렉토리는 로그인 정보를 포함합니다
   - Git에 커밋되지 않도록 `.gitignore`에 포함되어 있습니다

## 📊 기능 확장

### 링크 필터링

`src/mail/link-extractor.js`를 수정하여 특정 도메인의 링크만 추출:

```javascript
const link = extractLink(email.html, {
  domain: 'example.com'  // example.com이 포함된 링크만
});
```

### 여러 발신자 모니터링

`src/mail/email-parser.js`의 `isFromTargetSender` 함수를 수정:

```javascript
const targetSenders = ['sender1@example.com', 'sender2@example.com'];
const isMatch = targetSenders.some(sender =>
  emailFrom.includes(sender.toLowerCase())
);
```

## 📚 기술 스택

- **Node.js**: 런타임 환경
- **IMAP**: 이메일 실시간 모니터링 (imap 패키지)
- **Playwright**: 브라우저 자동화 및 PDF 생성
- **Telegram Bot API**: 메시지 및 파일 전송
- **Winston**: 로깅 시스템
- **Cheerio**: HTML 파싱 (링크 추출)
- **Mailparser**: 이메일 파싱

## 📄 라이선스

ISC

## 🤝 기여

버그 제보 및 기능 제안은 이슈로 등록해주세요.

## 📞 지원

문제가 발생하면 로그 파일(`logs/error.log`)을 확인하거나 이슈를 등록해주세요.

---

**Happy Automating! 🚀**
