# 구성 및 소스

**Configuration** 탭은 Alchemy가 무엇을 탐색하고 지능이 어떻게 적용될지 제어하는 중앙 컨트롤 타워입니다.

## 1. Desktop 앱 구성

RealTimeX Alchemy가 올바르게 작동하고 AI 서비스에 액세스하려면 **RealTimeX Desktop** 내에서 **로컬 앱(Local App)**으로 추가되어야 합니다.

1.  RealTimeX Desktop에서 **Local Apps**로 이동합니다.
2.  **Add Local App**을 클릭합니다.
3.  다음 구성을 붙여넣습니다:

```json
{
  "command": "npx",
  "args": [
    "@realtimex/realtimex-alchemy@latest",
    "--port",
    "3024"
  ]
}
```

이렇게 하면 Alchemy의 최신 버전을 자동으로 가져와 3024 포트에서 시작합니다.

## 2. 브라우저 소스

Alchemy는 다음 브라우저에 대해 크로스 플랫폼 탐색을 지원합니다:
-   **Chrome**: 여러 프로필 지원.
-   **Microsoft Edge**: 여러 프로필 지원.
-   **Safari**: (macOS 전용) 전체 디스크 접근 권한이 필요합니다.
-   **Brave**: 여러 프로필 지원.

### 설정 팁:
-   추출 오류가 발생하는 경우 브라우저가 기록 파일을 독점적으로 잠근 상태로 열려 있지 않은지 확인하세요.
-   macOS에서 Safari를 탐색하는 경우 시스템 설정에서 Alchemy 앱(또는 터미널)에 **"전체 디스크 접근"** 권한이 허용되어 있는지 확인하세요.

## 3. AI 프로바이더 (Desktop 앱에서 관리)

Alchemy는 자체 AI 프로바이더 키를 관리하지 **않습니다**. 대신 **RealTimeX SDK**를 사용하여 **RealTimeX Desktop** 애플리케이션에 구성된 프로바이더에 액세스합니다.

-   **LLM 프로바이더**: Desktop 앱을 통해 관리(OpenAI, Anthropic, Ollama 등 지원).
-   **임베더(Embedder) 프로바이더**: Desktop 앱을 통해 관리.

Alchemy가 사용하는 모델을 변경하려면 RealTimeX Desktop 앱의 전역 설정을 업데이트하세요.

## 4. 엔진 설정

### 동기화 창
-   **Sync From**: Alchemy가 기록을 얼마나 멀리 거슬러 올라가 탐색할지 결정합니다.
-   **Sync Frequency**: Miner가 백그라운드에서 실행되는 빈도를 제어합니다.

### 인텔리전스 설정
-   **차단된 태그 (Blocked Tags)**: 항상 무시해야 할 키워드나 도메인을 수동으로 정의합니다.
-   **페르소나 (Persona)**: AI의 스코어링 로직을 안내하는 활성 학습 프로필(Boost/Dismiss)입니다.

## 5. 계정 설정

-   **프로필**: 이름과 아바타를 관리합니다.
-   **Supabase 연결**: 데이터베이스를 이동한 경우 프로젝트 URL과 키를 업데이트하세요.
-   **사운드 및 햅틱**: 새로운 발견이나 AI 알림에 대한 오디오 피드백을 켜거나 끕니다.

---

> [!TIP]
> Alchemy가 시그널 점수를 매기지 않는 경우, **RealTimeX Desktop** 전역 설정을 확인하여 AI 프로바이더(Ollama 또는 OpenAI 등)가 활성 상태이고 연결되어 있는지 확인하세요.
