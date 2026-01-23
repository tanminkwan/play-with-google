# 🛠 AI News Video Automation: Setup & Usage Guide

이 문서는 프로젝트 설치부터 서비스 실행, 그리고 실제 사용까지의 전 과정을 설명하는 가이드입니다.

---

## 1. 사전 준비 사항 (Prerequisites)

시스템에 다음 도구들이 설치되어 있어야 합니다:
- **Docker & Docker Compose**: 서비스 컨테이너화 및 오케스트레이션.
- **Node.js (v18 이상)**: 로컬 테스트 및 스크립트 실행.
- **FFmpeg**: (로컬 실행 시 필요) 영상 및 오디오 처리용.

---

## 2. 설치 단계 (Installation)

### 2.1 저장소 복제 및 의존성 설치
```bash
# 의존성 패키지 설치
npm install
```

### 2.2 환경 변수 설정
루트 디렉토리에 `.env` 파일을 생성하고 다음 정보를 입력합니다:
```env
# AI Services
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth (YouTube Upload)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2.3 YouTube API 인증
YouTube 업로드를 위해 처음에 한 번 인증이 필요합니다:
1. `node youtube_uploader.js`를 실행합니다.
2. 터미널에 표시된 URL에 접속하여 구글 로그인을 진행합니다.
3. 인증 코드(Code)를 터미널에 입력하면 `token.json`이 생성됩니다.

---

## 3. 서비스 실행 (Running Services)

### 3.1 Docker를 이용한 전체 스택 실행
Windmill 및 데이터베이스를 실행합니다:
```bash
docker compose up -d --build
```
- **Windmill**: [http://localhost:8000](http://localhost:8000) (ID: `admin@windmill.dev` / PW: `admin`)

---

## 4. 모듈별 사용 방법 (CLI usage)

전체 파이프라인을 실행하기 전, 각 단계를 개별적으로 테스트할 수 있습니다.

### 4.1 뉴스 검색 및 대본 생성
```bash
# [키워드] [언어: Korean/English]
node openai_news_search.js "Apple Vision Pro" "Korean"
```

### 4.2 음성 파일 생성 (TTS)
```bash
node generate_batch_tts.js
```

### 4.3 이미지 생성 (DALL-E)
```bash
node generate_images.js
```

### 4.4 영상 합성 (FFmpeg)
```bash
node generate_video.js
```

### 4.5 YouTube 업로드
```bash
node youtube_uploader.js
```

### 4.6 전체 파이프라인 한 번에 실행 (추천)
모든 단계를 자동으로 순차 실행합니다.
```bash
# node pipeline.js [키워드] [언어]
node pipeline.js "전기차 화재 문제" "Korean"
```

---

## 5. Windmill 파이프라인 구성 가이드

실제 자동화를 위해 Windmill에서 Flow를 구성하는 방법입니다.

1. **스크립트 등록**: `windmill_scripts/` 폴더 내의 5개 파일 내용을 Windmill UI의 **Scripts** 탭에 각각 등록합니다.
2. **Resource 설정**: API 키들을 Windmill의 **Variables**나 **Resource Types**로 등록하여 관리합니다.
3. **Flow 생성**: 등록한 스크립트들을 순서대로 배치합니다.
   - `Step 1 (Script)` -> `Step 2 (TTS)` & `Step 3 (Images)` 병렬 실행 -> `Step 4 (Video)` -> `Step 5 (Upload)`
4. **실행**: Keyword와 Language를 입력하고 **Run**을 클릭하면 모든 과정이 자동으로 진행됩니다.

---

## 6. Windmill CLI (`wmill`) 사용 가이드

브라우저 UI를 사용하지 않고 터미널에서 파이프라인을 관리 및 실행할 수 있습니다.

### 6.1 CLI 설치 및 설정
```bash
# 글로벌 설치
npm install -g windmill-cli

# 워크스페이스 추가 및 인증 (기본: default / http://localhost:8000)
wmill workspace add MyWork default http://localhost:8000
```

### 6.2 주요 명령어
- **스크립트 실행**: `wmill script run f/get_news_script --args '{"keyword": "AI 뉴스", "language": "Korean"}'`
- **Flow 실행**: `wmill flow run f/news_to_youtube_flow --args '{"keyword": "K-pop 위기"}'`
- **로컬 동기화**: `wmill script push` (로컬 변경사항 업로드), `wmill sync pull` (서버 스크립트 다운로드)

---

## 7. 테스트 실행 (Testing)

코드의 무결성을 확인하려면 다음 명령어를 실행하세요:
```bash
# 전체 유닛 테스트 실행
npm test

# 특정 기능 테스트 (예: 영상 합성)
npm test tests/generate_video.test.js
```

---

## 8. 결과물 확인
- **영상 파일**: `./videos/final_video.mp4`
- **중간 소스**: `./videos/scenes/` (MP3, PNG, TXT 파일들)
- **YouTube**: 업로드 성공 시 터미널 또는 Windmill 결과창에 동영상 링크가 출력됩니다.
