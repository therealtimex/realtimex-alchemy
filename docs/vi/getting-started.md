# Bắt đầu với RealTimeX Alchemy

Hướng dẫn này sẽ dẫn dắt bạn qua quá trình thiết lập RealTimeX Alchemy lần đầu tiên.

## 1. Cài đặt

RealTimeX Alchemy được thiết kế để chạy như một **Ứng dụng cục bộ (Local App)** trong môi trường **RealTimeX Desktop**. Sự tích hợp này cho phép Alchemy tận dụng các khả năng AI mạnh mẽ của ứng dụng Desktop.

### Tích hợp RealTimeX (Bắt buộc)
1.  **Tải xuống và Cài đặt**: Tải ứng dụng RealTimeX Desktop từ [realtimex.ai](https://realtimex.ai).
2.  **Thêm Alchemy**:
    -   Mở RealTimeX Desktop.
    -   Vào mục **Local Apps**.
    -   Nhấp vào **Add Local App** và dán cấu hình từ [Hướng dẫn Cấu hình](configuration.md#1-cau-hinh-ung-dung-desktop).

> [!IMPORTANT]
> Alchemy **phải** chạy như một ứng dụng cục bộ để truy cập RealTimeX SDK. Việc chạy độc lập qua CLI chỉ dành cho gỡ lỗi nâng cao và sẽ không có quyền truy cập vào các nhà cung cấp AI trừ khi được cấu hình thủ công.

### Điều kiện tiên quyết
-   **Node.js**: Phiên bản 18 trở lên.
-   **RealTimeX Desktop**: Phải đang chạy để cung cấp các dịch vụ LLM và Embedding.
-   **Tài khoản Supabase**: Cần thiết cho mô hình bảo mật **"Sở hữu cơ sở dữ liệu của riêng bạn"**.

## 2. Thiết lập ban đầu

Khi bạn khởi chạy Alchemy thông qua RealTimeX Desktop, nó sẽ tự động kết nối với **RealTimeX SDK**.

### Bước 1: Kết nối cơ sở dữ liệu
Nhập URL Supabase và Service Role Key của bạn. Kết nối an toàn này lưu trữ các tín hiệu đã khai thác, lịch sử trò chuyện và các vector nhúng (embeddings) của bạn.

### Bước 2: Chạy Migrations
Trình hướng dẫn thiết lập sẽ phát hiện nếu cơ sở dữ liệu của bạn cần khởi tạo. Nhấp vào **"Run Migrations"** để thiết lập các bảng và hàm thời gian thực cần thiết.

### Nhà cung cấp AI (Tự động)
Khác với các ứng dụng độc lập, bạn **không cần cấu hình API key** (như OpenAI hoặc Anthropic) bên trong Alchemy. Alchemy kế thừa các nhà cung cấp này trực tiếp từ cài đặt **RealTimeX Desktop** của bạn thông qua SDK.

## 3. Kết nối nguồn trình duyệt

Alchemy khám phá lịch sử trình duyệt của bạn để tìm "tín hiệu".
1.  Vào tab **Configuration**.
2.  Bật các trình duyệt bạn muốn khai thác (Chrome, Edge, Safari, Brave).
3.  Đặt ngày **"Sync From"**. Alchemy sẽ xử lý lịch sử từ thời điểm đó trở đi.

## 4. Lần đồng bộ đầu tiên

Nhấp vào nút **"Sync History"** ở thanh bên. Bạn có thể theo dõi **Live Terminal** để thấy các URL đang được khám phá và chấm điểm trong thời gian thực bởi các nhà cung cấp AI đã tích hợp.

---

> [!TIP]
> Vì quá trình xử lý AI được đảm nhận bởi RealTimeX Desktop, hãy đảm bảo bạn đã cấu hình một nhà cung cấp (như Ollama hoặc OpenAI) trong **cài đặt chung của ứng dụng Desktop** trước khi bắt đầu đồng bộ hóa.
