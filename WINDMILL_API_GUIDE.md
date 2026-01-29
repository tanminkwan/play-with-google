# 🎡 Windmill API Automation Guide

이 문서는 무겁고 복잡한 CLI 대신, **Windmill API (curl)**를 사용하여 프로젝트 인프라를 가볍고 확실하게 관리하는 방법을 설명합니다.

---

## 🚀 1. 빠른 시작 (Quick Start)

모든 관리 기능은 `manage_windmill.sh` 스크립트에 통합되어 있습니다.

### 전제 조건
- `.env` 파일에 `WMILL_TOKEN`이 설정되어 있어야 합니다.
- **Python 3**가 설치되어 있어야 합니다 (대부분의 Linux 환경에 기본 설치됨).
  *(더 이상 `jq` 유틸리티를 별도로 설치할 필요가 없습니다.)*

### 사용법 예시

#### 1. 워크스페이스 생성
```bash
# 사용법: ./manage_windmill.sh create_workspace [이름] [ID]
./manage_windmill.sh create_workspace "Production Env" "prod_workspace"
```

#### 2. 스크립트 배포
```bash
# 사용법: ./manage_windmill.sh deploy_script [워크스페이스ID] [원격경로] [로컬파일]
./manage_windmill.sh deploy_script "prod_workspace" "u/admin/hello" "./test_script.js"
```

---

## 🛠 2. 스크립트 상세 설명 (`manage_windmill.sh`)

이 스크립트는 Windmill의 REST API 엔드포인트와 직접 통신합니다.

- **인증**: `.env` 파일의 `WMILL_TOKEN`을 자동으로 로드하여 `Bearer` 헤더에 추가합니다.
- **예외 처리**: 워크스페이스가 이미 존재할 경우(HTTP 409), 에러를 내지 않고 우아하게 건너뜁니다.
- **언어 감지**: 파일 확장자(`.js`, `.py`)를 분석하여 자동으로 Windmill 언어 타입을 설정합니다.

---

## 📚 3. 기본 API 정보 (참고용)

스크립트 없이 직접 `curl`을 사용하고 싶다면 아래 정보를 참고하세요.

### Base URL
`http://localhost:8000/api`

### 핵심 엔드포인트
| 기능 | Method | URL |
|---|---|---|
| 워크스페이스 생성 | POST | `/w/create` |
| 스크립트 생성 | POST | `/w/{workspace}/scripts/create` |
| Flow 생성 | POST | `/w/{workspace}/flows/create` |

### 인증 헤더
```
Authorization: Bearer <YOUR_TOKEN>
```
