# Cấu hình & Nguồn dữ liệu

Tab **Configuration** là trung tâm chỉ huy của bạn để kiểm soát những gì Alchemy khai thác và cách trí tuệ của nó được áp dụng.

## 1. Cấu hình Ứng dụng Desktop

RealTimeX Alchemy phải được thêm vào như một **Ứng dụng cục bộ (Local App)** trong **RealTimeX Desktop** để hoạt động chính xác và truy cập các dịch vụ AI.

1.  Trong RealTimeX Desktop, vào phần **Local Apps**.
2.  Nhấp vào **Add Local App**.
3.  Dán cấu hình sau:

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

Điều này sẽ tự động tải phiên bản mới nhất của Alchemy và khởi động nó trên cổng 3024.

## 2. Nguồn trình duyệt

Alchemy hỗ trợ khai thác đa nền tảng cho các trình duyệt sau:
-   **Chrome**: Hỗ trợ nhiều hồ sơ (profiles).
-   **Microsoft Edge**: Hỗ trợ nhiều hồ sơ.
-   **Safari**: (chỉ trên macOS) Yêu cầu quyền Full Disk Access.
-   **Brave**: Hỗ trợ nhiều hồ sơ.

### Mẹo thiết lập:
-   Đảm bảo trình duyệt của bạn KHÔNG mở với tệp lịch sử bị khóa độc quyền nếu bạn gặp lỗi trích xuất.
-   Trên macOS, nếu bạn khai thác Safari, hãy đảm bảo ứng dụng Alchemy (hoặc terminal) có quyền **Full Disk Access** trong Cài đặt hệ thống.

## 3. Nhà cung cấp AI (Được quản lý bởi Desktop)

Alchemy **không** quản lý các khóa (keys) của nhà cung cấp AI riêng. Thay vào đó, nó sử dụng **RealTimeX SDK** để truy cập các nhà cung cấp được cấu hình trong ứng dụng **RealTimeX Desktop** của bạn.

-   **Nhà cung cấp LLM**: Được quản lý qua Ứng dụng Desktop (hỗ trợ OpenAI, Anthropic, Ollama, v.v.).
-   **Nhà cung cấp Embedder**: Được quản lý qua Ứng dụng Desktop.

Để thay đổi mô hình mà Alchemy sử dụng, hãy cập nhật cài đặt chung của bạn trong ứng dụng RealTimeX Desktop.

## 4. Cài đặt Công cụ (Engine)

### Cửa sổ đồng bộ (Sync Window)
-   **Sync From**: Xác định mức độ quay ngược thời gian trong lịch sử của bạn để Alchemy tìm kiếm.
-   **Sync Frequency**: Kiểm soát tần suất Miner chạy trong nền.

### Cài đặt Trí tuệ (Intelligence Settings)
-   **Thẻ bị chặn (Blocked Tags)**: Thủ công định nghĩa các từ khóa hoặc tên miền luôn bị bỏ qua.
-   **Chân dung (Persona)**: Hồ sơ học tập chủ động của bạn (Boost/Dismiss) giúp dẫn dắt logic chấm điểm của AI.

## 5. Cài đặt Tài khoản (Kết nối Supabase)

-   **Hồ sơ (Profile)**: Quản lý tên và ảnh đại diện của bạn.
-   **Kết nối Supabase**: Cập nhật **URL Supabase** và **Anon Public Key** của bạn nếu bạn di chuyển cơ sở dữ liệu.
-   **Migrations cơ sở dữ liệu**: Khi cập nhật lược đồ (schema) của bạn thông qua Trình hướng dẫn thiết lập, bạn sẽ được yêu cầu nhập **Supabase Access Token**.
-   **Âm thanh & Phản hồi**: Bật/tắt phản hồi âm thanh cho các khám phá mới hoặc cảnh báo AI.

---

> [!TIP]
> Nếu Alchemy không chấm điểm các tín hiệu, hãy kiểm tra cài đặt chung của **RealTimeX Desktop** để đảm bảo một nhà cung cấp AI (như Ollama hoặc OpenAI) đang hoạt động và được kết nối.
