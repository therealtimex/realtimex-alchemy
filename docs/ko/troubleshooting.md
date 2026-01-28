# 문제 해결 및 지원

RealTimeX Alchemy를 사용하는 동안 문제가 발생하면 이 가이드를 통해 진단하고 해결해 보세요.

## 1. 데이터베이스 연결 오류

-   **"Failed to connect to Supabase"**: 인터넷 연결을 확인하고 설정 마법사나 `.env` 파일에 있는 `SUPABASE_URL` 및 `SUPABASE_KEY` (Service Role 또는 Anon)를 확인하세요.
-   **"Table 'xyz' does not exist"**: 마이그레이션을 누락했을 수 있습니다. 설정 마법사로 이동하여 **"Run Migrations"**를 다시 클릭하세요.

## 2. 브라우저 채굴 관련 문제

-   **"Extraction failed: History file is locked"**: 브라우저(Chrome/Edge/Brave)가 열려 있어 기록 데이터베이스 파일을 독점적으로 잠그고 있을 때 발생합니다. 브라우저를 닫고 다시 동기화를 시도하세요.
-   **"Permission Denied" (Safari)**: macOS에서 Safari 기록은 보호되어 있습니다. *시스템 설정 > 개인정보 보호 및 보안 > 전체 디스크 접근 권한*에서 Alchemy 앱(또는 실행 중인 터미널/IDE)에 **"전체 디스크 접근 권한"**을 허용해야 합니다.
-   **"No history found"**: 브라우징 기록이 있는 기간으로 **"Sync From"** 날짜를 설정했는지 확인하세요.

## 3. 인텔리전스 / AI 오류 (SDK 통합)

Alchemy는 **RealTimeX SDK**를 사용하므로, 대부분의 AI 관련 오류는 **RealTimeX Desktop** 전역 설정과 관련이 있습니다.

-   **"AI Provider not found"**: **RealTimeX Desktop** 앱의 전역 설정에서 AI 프로바이더(OpenAI 또는 Ollama 등)가 구성되어 있고 활성화되어 있는지 확인하세요.
-   **"SDK connection failed"**: Alchemy가 RealTimeX Desktop 내에서 **로컬 앱(Local App)**으로 실행 중인지 확인하세요. 독립 실행형 인스턴스는 SDK 서비스에 액세스할 수 없습니다.
-   **"Ollama unreachable"**: Ollama를 사용하는 경우, 실행 중인지(`ollama serve`)와 RealTimeX Desktop에서 선택한 모델이 다운로드되었는지 확인하세요.
-   **"정확도가 낮거나 답변이 이상함"**: Alchemy는 RAG를 사용합니다. AI에게 무엇이 중요한지 문맥을 제공하기 위해 몇 가지 시그널을 "Boost"했는지 확인하세요. 또한 **시스템 로그**를 확인하여 Alchemist 서비스가 스코어링 중에 오류가 발생했는지 확인하세요.

## 4. 시스템 로그 읽기

더 자세한 기술적 문제 해결을 위해 **System Logs** 탭을 확인하세요.
-   **Live Terminal**: 실시간으로 발생하는 원시 프로세스 로그를 모니터링합니다.
-   **Recent Errors**: 동기화 또는 분석 중 발생한 오류 목록을 확인합니다.
-   **Action Center**: 블랙리스트 제안이나 총 시그널 수를 확인하여 엔진이 노이즈로 인해 부하가 걸리지 않았는지 확인합니다.

## 5. 도움말 및 지원

여기에서 문제를 해결할 수 없는 경우:
-   최신 버전을 사용 중인지 [Changelog](../CHANGELOG.md)을 확인하세요.
-   토론 및 문제 추적을 위해 [GitHub 저장소](https://github.com/therealtimex/realtimex-alchemy)를 방문하세요.

---

> [!CAUTION]
> 공개 포럼이나 문제 보고서에 Supabase Service Role Key 또는 API 키를 절대 공유하지 마세요.
