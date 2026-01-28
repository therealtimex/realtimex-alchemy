# Trò chuyện với Kiến thức Cá nhân

RealTimeX Alchemy có giao diện trò chuyện được hỗ trợ bởi **RAG** (Retrieval-Augmented Generation) đầy đủ, cho phép bạn "nói chuyện" với lịch sử trình duyệt của mình.

## Cách thức hoạt động

Khi bạn đặt một câu hỏi trong tab **Chat**, Alchemy không chỉ dựa vào dữ liệu đào tạo chung của AI. Thay vào đó, nó tuân theo các bước sau:

1.  ### Tìm kiếm Ngữ nghĩa (Semantic Search)
    Câu hỏi của bạn được chuyển đổi thành một vector nhúng.
2.  ### Truy xuất Tín hiệu (Signal Retrieval)
    Alchemy tìm kiếm trong cơ sở dữ liệu Supabase của bạn để tìm các tín hiệu có liên quan nhất (Nội dung nguồn, tóm tắt và thực thể) khớp với câu hỏi của bạn.
3.  ### Câu trả lời theo Ngữ cảnh
    AI nhận được câu hỏi của bạn *cùng với* ngữ cảnh có liên quan từ lịch sử của bạn để đưa ra câu trả lời chính xác và có trích dẫn.

## Các tính năng chính của Trò chuyện

### 1. Trích dẫn Nguồn
AI sẽ đề cập rõ ràng những tín hiệu nào nó đã sử dụng để tạo ra câu trả lời. Bạn có thể nhấp vào các trích dẫn này để mở nguồn ban đầu hoặc thẻ tín hiệu.

### 2. Quản lý Phiên làm việc
Các cuộc trò chuyện được tổ chức thành các phiên. Alchemy tự động tạo tiêu đề phù hợp cho phiên của bạn (ví dụ: "Tổng hợp các xu hướng AI" hoặc "Nghiên cứu các Framework mới") dựa trên chủ đề cuộc hội thoại.

### 3. Bộ nhớ Cố định
Các phiên trò truyện của bạn được lưu vào Supabase, vì vậy bạn có thể tiếp tục cuộc hội thoại ở nơi bạn đã dừng lại trên bất kỳ thiết bị nào được kết nối với cơ sở dữ liệu của bạn.

## Mẹo để có kết quả trò chuyện tốt hơn

-   **Cụ thể hơn**: Thay vì hỏi "Tôi đã đọc gì hôm nay?", hãy thử "Tôi đã đọc gì hôm nay về các giải pháp Ethereum Layer 2?".
-   **Yêu cầu Tóm tắt**: "Tóm tắt các tin tức quan trọng tôi đã tìm thấy trong tuần này liên quan đến đối thủ X."
-   **Câu hỏi Tổng hợp**: "So sánh ba bài báo khác nhau mà tôi đã đọc về React Server Components và liệt kê các ưu/nhược điểm được đề cập."

---

> [!TIP]
> Giao diện trò chuyện hỗ trợ **GitHub Flavored Markdown (GFM)**, giúp bạn dễ dàng đọc các khối mã, bảng và danh sách đã được định dạng trong các câu trả lời của AI.
