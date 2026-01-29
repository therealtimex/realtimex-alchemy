# Khắc phục sự cố & Hỗ trợ

Nếu bạn gặp phải sự cố với RealTimeX Alchemy, hướng dẫn này sẽ giúp bạn chẩn đoán và giải quyết các vấn đề phổ biến.

## 1. Lỗi kết nối cơ sở dữ liệu

-   **"Failed to connect to Supabase"**: Kiểm tra kết nối Internet của bạn và xác minh **URL Supabase** và **Anon Public Key** trong Trình hướng dẫn thiết lập hoặc tệp `.env`. KHÔNG sử dụng Service Role Key cho các kết nối thông thường.
-   **"Table 'xyz' does not exist"**: Bạn có thể đã bỏ lỡ một migration. Vào Trình hướng dẫn thiết lập và nhấp vào **"Run Migrations"** một lần nữa. Bạn sẽ cần **Supabase Access Token** cho bước này.

## 2. Vấn đề khai thác trình duyệt

-   **"Extraction failed: History file is locked"**: Điều này xảy ra nếu trình duyệt của bạn (Chrome/Edge/Brave) hiện đang mở và khóa chặt cơ sở dữ liệu lịch sử của nó. Hãy thử đóng trình duyệt và chạy lại đồng bộ.
-   **"Permission Denied" (Safari)**: Trên macOS, lịch sử Safari được bảo vệ. Bạn phải cấp quyền **Full Disk Access** cho ứng dụng Alchemy (hoặc Terminal/IDE bạn đang chạy) trong *Cài đặt hệ thống > Quyền riêng tư & Bảo mật > Full Disk Access*.
-   **"No history found"**: Đảm bảo bạn đã đặt ngày **"Sync From"** vào một khoảng thời gian mà bạn có lịch sử duyệt web.

## 3. Lỗi Trí tuệ / AI (Tích hợp SDK)

Vì Alchemy sử dụng **RealTimeX SDK**, hầu hết các lỗi AI đều liên quan đến cài đặt chung của **RealTimeX Desktop**.

-   **"AI Provider not found"**: Đảm bảo rằng một nhà cung cấp AI (như OpenAI hoặc Ollama) đã được cấu hình và đang hoạt động trong cài đặt chung của ứng dụng **RealTimeX Desktop**.
-   **"SDK connection failed"**: Xác minh rằng Alchemy đang chạy như một **Ứng dụng cục bộ (Local App)** trong RealTimeX Desktop. Các phiên bản độc lập không thể truy cập các dịch vụ SDK.
-   **"Ollama unreachable"**: Nếu sử dụng Ollama, hãy đảm bảo nó đang chạy (`ollama serve`) và mô hình bạn đã chọn trong RealTimeX Desktop đã được tải xuống.
-   **"Độ chính xác thấp/câu trả lời kỳ lạ"**: Alchemy sử dụng RAG. Đảm bảo bạn đã "Boost" một số tín hiệu để cung cấp cho AI ngữ cảnh. Ngoài ra, hãy kiểm tra **Nhật ký hệ thống** để xem liệu dịch vụ Alchemist có gặp lỗi trong quá trình chấm điểm hay không.

## 4. Đọc Nhật ký Hệ thống

Để khắc phục sự cố kỹ thuật sâu hơn, hãy truy cập tab **System Logs**:
-   **Live Terminal**: Xem nhật ký quy trình gốc khi chúng xảy ra.
-   **Lỗi gần đây (Recent Errors)**: Xem danh sách tổng hợp các lỗi thất bại trong quá trình đồng bộ hoặc phân tích.
-   **Trung tâm hành động (Action Center)**: Kiểm tra các đề xuất danh sách đen hoặc tổng số lượng tín hiệu để xem liệu công cụ có đang "ngộp" vì quá nhiều nhiễu hay không.

## 5. Nhận hỗ trợ

Nếu vấn đề của bạn không được đề cập ở đây:
-   Kiểm tra [Changelog](../CHANGELOG.md) để xem bạn có đang ở phiên bản mới nhất hay không.
-   Truy cập [Kho lưu trữ GitHub](https://github.com/therealtimex/realtimex-alchemy) để thảo luận và theo dõi vấn đề.

---

> [!CAUTION]
> Không bao giờ chia sẻ Supabase Access Token hoặc API Keys của bạn trong các diễn đàn công cộng hoặc báo cáo sự cố.
