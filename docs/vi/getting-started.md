# Bắt đầu với RealTimeX Alchemy

Hướng dẫn này sẽ dẫn dắt bạn qua quá trình thiết lập RealTimeX Alchemy lần đầu tiên.

## 1. Cài đặt & Tích hợp Desktop

RealTimeX Alchemy được thiết kế để chạy như một **Ứng dụng cục bộ (Local App)** trong môi trường **RealTimeX Desktop**. Sự tích hợp này cho phép Alchemy tận dụng các khả năng AI mạnh mẽ và môi trường Node.js của ứng dụng Desktop.

### Bước 1: Cài đặt RealTimeX Desktop
1.  **Tải xuống và Cài đặt**: Tải ứng dụng RealTimeX Desktop từ [realtimex.ai](https://realtimex.ai).
2.  **Mở RealTimeX Desktop**.

### Bước 2: Cài đặt Alchemy từ Marketplace
Cách dễ nhất để cài đặt Alchemy là thông qua marketplace tích hợp:
1.  Trong RealTimeX Desktop, vào tab **Marketplace**.
2.  Tìm kiếm **"Alchemy"**.
3.  Nhấp vào **Purchase** (hoặc Install).

![Mua Alchemy](../images/purchase-alchemy-app.png)

> [!TIP]
> **Cài đặt thủ công (Nâng cao)**: Nếu bạn muốn cài đặt qua script, bạn có thể nhấp vào **Add Local App** trong tab **Local Apps** và sử dụng cấu hình này:
> ```json
> {
>   "command": "npx",
>   "args": ["@realtimex/realtimex-alchemy@latest", "--port", "3024"]
> }
> ```
> (Lưu ý: Bạn có thể thay đổi `"3024"` thành bất kỳ cổng nào còn trống nếu cần).

> [!IMPORTANT]
> Alchemy **phải** chạy như một ứng dụng cục bộ để truy cập RealTimeX SDK. Việc chạy độc lập qua CLI chỉ dành cho gỡ lỗi nâng cao và sẽ không có quyền truy cập vào các nhà cung cấp AI trừ khi được cấu hình thủ công.

### Điều kiện tiên quyết
-   **RealTimeX Desktop**: Phải đang chạy để cung cấp các dịch vụ LLM và Embedding, cũng như môi trường máy chủ Node.js cơ sở.
-   **Tài khoản Supabase**: Cần thiết cho mô hình bảo mật **"Sở hữu cơ sở dữ liệu của riêng bạn"**.

## 2. Thiết lập ban đầu

Khi bạn khởi chạy Alchemy thông qua RealTimeX Desktop, nó sẽ tự động kết nối với **RealTimeX SDK**.

### Bước 1: Kết nối cơ sở dữ liệu
Nhập **URL Supabase** và **Anon Public Key**. Kết nối an toàn này cho phép Alchemy lưu trữ và truy xuất các tín hiệu đã khai thác, lịch sử trò chuyện và các vector nhúng (embeddings) của bạn.

### Bước 2: Chạy Migrations
Trình hướng dẫn thiết lập sẽ phát hiện nếu cơ sở dữ liệu của bạn cần khởi tạo. Để thiết lập các bảng và hàm thời gian thực cần thiết, bạn sẽ cần cung cấp **Supabase Access Token** (được tạo từ Supabase Dashboard của bạn).

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
