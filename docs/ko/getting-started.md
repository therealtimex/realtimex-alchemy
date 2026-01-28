# RealTimeX Alchemy 시작하기

이 가이드는 RealTimeX Alchemy를 처음 설정하는 과정을 안내합니다.

## 1. 설치

RealTimeX Alchemy는 **RealTimeX Desktop** 환경 내에서 **로컬 앱(Local App)**으로 실행되도록 설계되었습니다. 이러한 통합을 통해 Alchemy는 Desktop 앱의 강력한 AI 기능을 활용할 수 있습니다.

### RealTimeX 통합 (필수)
1.  **다운로드 및 설치**: [realtimex.ai](https://realtimex.ai)에서 RealTimeX Desktop 앱을 받으세요.
2.  **Alchemy 추가**:
    -   RealTimeX Desktop을 엽니다.
    -   **Local Apps**로 이동합니다.
    -   **Add Local App**을 클릭하고 [구성 가이드](configuration.md#1-desktop-app-구성)의 구성을 붙여넣습니다.

> [!IMPORTANT]
> Alchemy가 RealTimeX SDK에 액세스하려면 **반드시** 로컬 앱으로 실행되어야 합니다. CLI를 통한 독립 실행은 고급 디버깅 전용이며, 수동으로 구성하지 않는 한 AI 프로바이더에 액세스할 수 없습니다.

### 필수 조건
-   **Node.js**: 버전 18 이상.
-   **RealTimeX Desktop**: LLM 및 임베딩(Embedding) 서비스를 제공하기 위해 실행 중이어야 합니다.
-   **Supabase 계정**: **"자신만의 데이터베이스 소유"** 개인정보 보호 모델에 필요합니다.

## 2. 초기 설정

RealTimeX Desktop을 통해 Alchemy를 실행하면 자동으로 **RealTimeX SDK**에 연결됩니다.

### 1단계: 데이터베이스 연결
Supabase URL과 Service Role Key를 입력합니다. 이 보안 연결은 채굴된 시그널, 채팅 기록 및 임베딩을 저장합니다.

### 2단계: 마이그레이션 실행
설정 마법사는 데이터베이스 초기화가 필요한지 자동으로 감지합니다. **"Run Migrations"**를 클릭하여 필요한 테이블과 실시간 기능을 설정합니다.

### AI 프로바이더 (자동)
독립형 앱과 달리 Alchemy 내에서 **API 키(OpenAI 또는 Anthropic 등)를 구성할 필요가 없습니다**. Alchemy는 SDK를 통해 **RealTimeX Desktop** 설정에서 이러한 프로바이더를 직접 상속받습니다.

## 3. 브라우저 소스 연결

Alchemy는 브라우저 기록을 채굴하여 "시그널"을 찾습니다.
1.  **Configuration** 탭으로 이동합니다.
2.  채굴하려는 브라우저(Chrome, Edge, Safari, Brave)를 활성화합니다.
3.  **"Sync From"** 날짜를 설정합니다. Alchemy는 해당 시점부터 기록을 처리합니다.

## 4. 첫 동기화

사이드바의 **"Sync History"** 버튼을 클릭합니다. **Live Terminal**을 통해 통합된 AI 프로바이더가 실시간으로 URL을 발견하고 점수를 매기는 것을 확인할 수 있습니다.

---

> [!TIP]
> AI 처리는 RealTimeX Desktop에서 담당하므로, 동기화를 시작하기 전에 **Desktop 앱의 전역 설정**에서 프로바이더(Ollama 또는 OpenAI 등)가 구성되어 있는지 확인하세요.
