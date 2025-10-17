# 📧 Email to GitHub Pages PDF Service

Gmail을 실시간 모니터링하여 특정 발신자의 메일에서 링크를 추출하고, 웹페이지를 PDF로 변환하여 GitHub Pages에 자동 퍼블리싱하는 서비스입니다.

## ✨ 주요 기능

- 🔔 **실시간 메일 감지**: Gmail IMAP IDLE로 즉각 감지 (1-2초 이내)
- 🎯 **발신자 필터링**: 지정한 발신자의 메일만 처리
- 🔗 **링크 패턴 필터링**: 특정 패턴(예: `account/travel/verify`)이 포함된 링크만 추출
- 📄 **PDF 자동 생성**: Playwright로 웹페이지를 PDF로 변환
- 🔐 **세션 유지**: 브라우저 로그인 상태 자동 저장
- 📦 **자동 Git Push**: PDF 생성 시 자동으로 GitHub에 커밋 & 푸시
- 🗂️ **최대 3개 유지**: 오래된 PDF 자동 삭제 (최신 3개만 보관)
- 🌐 **웹 UI**: GitHub Pages에서 PDF 목록 확인 및 다운로드
- 📊 **로그 로테이션**: 크기 제한으로 로그 파일 자동 관리

## 🏗️ 시스템 구조

```
[Gmail]
    ↓ (IMAP IDLE 실시간 감지)
[IMAP Client - 발신자 필터링]
    ↓ (링크 패턴 추출)
[Playwright - PDF 생성]
    ↓ (docs/pdfs/에 저장)
[Git Commit & Push]
    ↓ (GitHub Repository)
[GitHub Pages 자동 배포]
    ↓
[웹 UI에서 PDF 확인]
```

## 📋 사전 준비

### 1. Gmail 앱 비밀번호 생성

1. [Google 계정 설정](https://myaccount.google.com/) 접속
2. **보안** → **2단계 인증** 활성화
3. **앱 비밀번호** 생성 (메일 선택)
4. 16자리 비밀번호 저장

### 2. GitHub Repository 생성

1. GitHub에서 새 Public Repository 생성 (예: `netflix-pdfs`)
2. Repository Settings → Pages → Source를 `main` 브랜치의 `/docs` 폴더로 설정
3. GitHub Pages URL 확인 (예: `https://username.github.io/netflix-pdfs/`)

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 수정:

```bash
# Gmail 정보
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-app-password-16-chars
TARGET_SENDER=sender@example.com

# 링크 필터 (선택)
LINK_PATTERN=account/travel/verify

# GitHub Pages URL
GITHUB_PAGE_URL=https://username.github.io/netflix-pdfs/

# 브라우저 설정
BROWSER_HEADLESS=false  # 첫 실행은 false (수동 로그인)
```

### 3. GitHub Repository 연결

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 4. 서비스 시작

```bash
npm start
```

### 5. 첫 실행 시 Netflix 로그인

- 브라우저 창이 열리면 Netflix에 **수동 로그인**
- 로그인 정보는 `./sessions/` 에 자동 저장
- 이후부터는 자동으로 로그인 유지
- 안정화되면 `BROWSER_HEADLESS=true`로 변경

## 📁 프로젝트 구조

```
netflix/
├── docs/                         # GitHub Pages
│   ├── index.html                # PDF 목록 웹 페이지
│   ├── pdfs.json                 # PDF 메타데이터
│   └── pdfs/                     # PDF 파일들 (최대 3개)
├── src/
│   ├── index.js                  # 메인 서비스
│   ├── mail/                     # IMAP 클라이언트
│   │   ├── imap-client.js        # Gmail 모니터링
│   │   ├── email-parser.js       # 이메일 파싱
│   │   └── link-extractor.js     # 링크 추출
│   ├── browser/
│   │   └── pdf-generator.js      # PDF 생성
│   ├── github/
│   │   └── publisher.js          # GitHub Pages 퍼블리싱
│   └── utils/
│       ├── logger.js             # 로깅 (2MB/5MB 로테이션)
│       └── config.js             # 설정 관리
├── sessions/                      # 브라우저 세션
├── temp/                          # 임시 PDF
└── logs/                          # 로그 파일
```

## 📝 동작 방식

1. **메일 도착** → Gmail에서 지정한 발신자로부터 메일 수신
2. **즉시 감지** → IMAP IDLE이 1-2초 내 감지
3. **링크 추출** → `LINK_PATTERN`에 맞는 링크 찾기
4. **PDF 생성** → Playwright로 웹페이지 PDF 변환
5. **파일 저장** → `docs/pdfs/2025-01-18_123456.pdf` 형식으로 저장
6. **목록 업데이트** → `docs/pdfs.json` 갱신 (최신 3개만 유지)
7. **Git Push** → 자동으로 커밋 & 푸시
8. **Pages 배포** → GitHub Pages가 1-2분 내 자동 업데이트
9. **웹에서 확인** → GitHub Pages URL에서 PDF 다운로드

## 🌐 웹 UI 기능

- 📱 반응형 디자인 (모바일/데스크톱)
- 🎨 그라데이션 UI
- 📅 날짜/시간 표시 (한국어)
- 📥 다운로드 버튼
- 🔄 최신 3개 PDF만 표시

## 🔧 백그라운드 실행 (PM2)

```bash
# PM2 설치
npm install -g pm2

# 서비스 시작
pm2 start src/index.js --name netflix-monitor

# 로그 확인
pm2 logs netflix-monitor

# 부팅 시 자동 시작
pm2 startup
pm2 save
```

## 🛠️ 문제 해결

### IMAP 연결 실패
```bash
# Gmail 앱 비밀번호가 올바른지 확인
# 2단계 인증이 활성화되어 있는지 확인
```

### Git Push 실패
```bash
# GitHub 인증 확인
# Repository 권한 확인
# git remote -v 로 URL 확인
```

### PDF 생성 실패
```bash
# Playwright 재설치
npx playwright install chromium

# 세션 파일 삭제 후 재로그인
rm -rf sessions/
```

## 🔒 보안

- `.env` 파일은 Git에 커밋되지 않음 (`.gitignore`)
- `sessions/` 디렉토리도 Git에 커밋되지 않음
- **Public Repository**: PDF가 누구나 볼 수 있으니 민감한 정보 주의

## 📚 기술 스택

- **Node.js**: 런타임
- **IMAP**: Gmail 실시간 모니터링
- **Playwright**: 브라우저 자동화 및 PDF 생성
- **Git**: 자동 커밋 & 푸시
- **GitHub Pages**: PDF 호스팅 및 웹 UI
- **Winston**: 로그 관리 (로테이션)

## 📄 라이선스

ISC

---

**Happy Automating! 🚀**
