# Trí tuệ & Học tập Chủ động

RealTimeX Alchemy không chỉ là một công cụ tìm kiếm; nó là một hệ thống đào tạo năng động cho AI cá nhân của bạn.

## Hệ thống chấm điểm Alchemist

Mỗi khi Miner tìm thấy một URL, **Dịch vụ Alchemist** sẽ phân tích nội dung và chỉ định một số điểm (0-100). Điểm số này quyết định mức độ nổi bật của tín hiệu đó trong tab Discovery của bạn.

### Ví dụ về các tiêu chí chấm điểm:
-   **Tác động cao (80-100)**: Tin tức thị trường quan trọng, các bản phát hành công nghệ lớn, các thay đổi sản phẩm đáng kể.
-   **Tác động trung bình (50-79)**: Các bài đăng blog kích thích tư duy, các hướng dẫn kỹ thuật chất lượng cao, phân tích ngành chi tiết.
-   **Tác động thấp (< 50)**: Tin tức chung, nhiễu mạng xã hội, các trang đích không có nội dung sâu.

## Học tập chủ động: Huấn luyện AI của bạn

Alchemy học hỏi từ hành vi của bạn thông qua **Dịch vụ Persona**.

### 1. Boost (Quan tâm mạnh mẽ)
Khi bạn **"Boost"** một tín hiệu, những điều sau sẽ xảy ra:
-   AI ghi lại sự quan tâm của bạn đối với các danh mục và thẻ của tín hiệu đó.
-   Một **Vector Nhúng (Vector Embedding)** được tạo/ưu tiên cho tín hiệu đó, cải thiện khả năng truy xuất nó trong Trò chuyện.
-   Nội dung tương tự sẽ được chấm điểm cao hơn trong các lần đồng bộ tương lai.

### 2. Dismiss (Không quan tâm)
Khi bạn **"Dismiss"** một tín hiệu:
-   Tín hiệu sẽ bị ẩn khỏi nguồn cấp dữ liệu chính của bạn.
-   AI học được rằng loại nội dung này là "nhiễu" đối với bạn.
-   Điểm số cho các URL hoặc chủ đề tương tự sẽ bị giảm trong các lần đồng bộ tương lai.

## Chân dung người dùng (User Persona)

Alchemy xây dựng một mô hình toán học về mối quan tâm của bạn. Bạn có thể coi đây là "Bản sao kỹ thuật số trí tuệ" của mình.
-   **Mối quan tâm (Interests)**: Các chủ đề bạn thường xuyên Boost hoặc tham gia.
-   **Phản mẫu (Anti-patterns)**: Các chủ đề hoặc tên miền bạn liên tục Dismiss.

**Công cụ Chuyển hóa (Transmute Engine)** sử dụng chân dung này để lọc các bản tóm tắt của bạn, đảm bảo bạn chỉ dành thời gian cho những thông tin chi tiết có mật độ cao và thực sự quan trọng với bạn.

---

> [!NOTE]
> Ngay cả các tín hiệu "Điểm thấp" cũng được lưu giữ trong lịch sử của bạn (có thể xem trong Nhật ký hệ thống). Điều này cho phép bạn "Giải cứu" chúng nếu bạn cảm thấy Alchemist đã tính toán sai giá trị của chúng.
