# 📺 AI News Video Automation (TDD & Windmill)

본 프로젝트는 최신 뉴스 키워드를 바탕으로 대본 생성, 음성 합성(TTS), 이미지 생성(DALL-E), 영상 편집(FFmpeg), 그리고 YouTube 업로드까지의 전 과정을 자동화하는 파이프라인입니다. **TDD(Test-Driven Development)** 기반으로 설계되어 견고한 모듈 체계를 갖추고 있습니다.

## 🚀 주요 기능

-   **뉴스 검색 및 대본 생성**: OpenAI(GPT-4o) 또는 Google Gemini를 사용하여 대화형 뉴스 스크립트 생성 (한국어/영어 지원).
-   **배치 음성 생성 (TTS)**: OpenAI TTS API를 사용하여 앵커별 페르소나에 맞는 음성 파일 생성.
-   **최적화된 이미지 생성**: 대본 내용을 시각적 프롬프트로 요약하여 DALL-E 3 이미지 생성. 기업명, 브랜드 등 고유명사를 자동으로 탐지하여 이미지의 핵심 요소로 반영하며, 필요 시 로고를 영상 위에 직접 합성(Logo Overlay)하는 하이브리드 방식 지원.
-   **자동 영상 합성**: FFmpeg을 사용하여 이미지와 음성을 1920x1080 해상도로 정교하게 합성 및 결합.
-   **YouTube 게시**: Google YouTube Data API v3를 통한 자동 동영상 업로드.
-   **이메일 알림**: 영상 업로드 완료 시 등록된 여러 명의 수신자에게 깔끔한 HTML 형식의 리포트 발송 (Gmail SMTP 연동).
-   **워크플로우 자동화**: Windmill을 통한 서버 기반 엔드-투-엔드 파이프라인 구축.

---

### 🏗 아키텍처 및 파이프라인

전체 프로세스는 다음 7단계의 모듈로 구성됩니다:

0.  **News Collection** (`0_collect_news.js`): 키워드를 바탕으로 네이버 뉴스 등에서 기사 수집 및 컨텍스트 생성.
1.  **News Script** (`1_get_news_script.js`): 수집된 정보를 바탕으로 AI 대본 생성.
2.  **Voice Generation** (`2_generate_tts.js`): 배역별 OpenAI TTS 음성 생성.
3.  **Image Generation** (`3_generate_images.js`): DALL-E 이미지 생성 및 엔티티 도메인 기반 로고 합성.
4.  **Video Assembly** (`4_assemble_video.js`): FFmpeg을 사용한 최종 영상 인코딩.
5.  **YouTube Upload** (`5_upload_youtube.js`): YouTube Data API v3를 통한 자동 업로드.
6.  **Email Notification** (`6_send_email.js`): 완료 리포트/알림 발송.

---

## 🛠 설치 및 설정

```

### 2. 파이프라인 설정 (`config.json`)
화면 비율, 이미지 스타일, 뉴스 수집 개수 등을 `config.json`에서 자유롭게 커스터마이징할 수 있습니다:
```json
{
  "newsScraper": {
    "maxItems": 5
  },
  "imageGeneration": {
    "size": "1792x1024",
    "style": "Simplified cartoon style..."
  }
}
```

### 3. 서비스 실행 (Docker)
Windmill 및 Postgres를 포함한 전체 스택을 실행합니다:
```bash
docker compose up -d
```
-   **Windmill UI**: [http://localhost:8000](http://localhost:8000)
-   **ID/PW**: `admin@windmill.dev` / `admin`

---

## 🧪 테스트 (TDD)

본 프로젝트는 모든 핵심 로직에 대해 유닛 테스트를 포함하고 있습니다. Jest를 사용하여 API 모킹 및 로직 검증을 수행합니다.

### 테스트 실행
```bash
# 전체 테스트 실행
npm test

# 특정 모듈 테스트 실행 (예: 이미지 생성)
npm test tests/generate_images.test.js
```

---

## ⚙️ Windmill 파이프라인 구축

`./windmill_scripts/` 디렉토리에 있는 스크립트들을 Windmill UI에 등록하여 Flow를 구성할 수 있습니다.

1.  **Script 등록**: 각 `.js` 파일 내용을 Windmill 스크립트로 복사.
2.  **Flow 연결**: `News -> TTS -> Image -> Assembly -> Upload` 순으로 단계 구성.
3.  **병렬화**: TTS와 Image 생성 단계를 Parallel 노드로 묶어 실행 속도 최적화.

---

## 📂 파일 구조

-   `0_~ 6_`: 단계별 파이프라인 실행 스크립트.
-   `lib/`: 핵심 기능 모듈 (스크래퍼, 생성기, 유틸리티 등).
-   `tests/`: Jest 기반 유닛 테스트 파일.
-   `videos/news_context.json`: 수집된 뉴스 원본 데이터.
-   `videos/scenes/`: 작업 중 생성되는 중간 소스 (MP3, PNG, TXT).
-   `videos/final_video.mp4`: 최종 완성 영상.

---

## 📄 라이선스
MIT License
