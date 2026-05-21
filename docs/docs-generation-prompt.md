# Prompt sinh tài liệu kỹ thuật + hạ tầng local dev (cho dự án này)

> Copy toàn bộ khối dưới đây và đưa cho AI. Prompt này yêu cầu AI **đọc repo hiện tại** trước khi viết tài liệu, **không bịa tính năng** và chỉ tạo những gì khớp với code đang có.

---

## PROMPT

Bạn là Senior Staff Engineer. Nhiệm vụ: tạo bộ tài liệu kỹ thuật và hạ tầng local development cho dự án đang mở trong workspace.

### 0) Bắt buộc: đọc repo trước
- Trước khi viết, hãy **liệt kê cấu trúc thư mục** và xác định:
  - Framework backend (NestJS?), ORM (Prisma?), DB (PostgreSQL?), queue/cache (Redis/BullMQ?), thư viện PDF (pdf-lib?), dotenv/config, v.v.
  - Các entry points và cấu hình: module chính, bootstrap, config env, prisma schema.
- Chỉ đưa ra quyết định dựa trên những gì có trong repo. Nếu thiếu thông tin (vd: chưa có Dockerfile), ghi rõ “Chưa có trong repo” và đề xuất mặc định tối giản.

### 1) Nguyên tắc viết tài liệu
- Không invent thêm microservices, DB, message broker… nếu repo không có.
- Mọi config phải có lý do (rationale) ngắn gọn.
- Ưu tiên local dev đơn giản, dễ chạy trên Windows.
- Các giá trị nhạy cảm: chỉ dùng placeholder, không hard-code secret.

### 2) Deliverables (tạo/ghi đè đúng file)
Tạo các tài liệu Markdown sau (tên file đúng như liệt kê):

1) `CLAUDE.md` (root)
- Tổng quan dự án (1–2 đoạn)
- Tech stack (runtime, framework, ORM, DB, cache/queue nếu có)
- Kiến trúc thư mục hiện tại (map ngắn gọn)
- Quy ước code (TypeScript, async/await, error handling, naming)
- Quy ước env: **không đọc trực tiếp `process.env` trong business code**, dùng module config trung tâm (nếu repo đã có)
- Port allocation: backend, swagger, postgres, redis…
- Scope control: những thứ không làm (ví dụ: không thêm gRPC nếu project dùng REST)
- Notes cho AI/Claude: cách chạy, cách test, nơi đặt config

2) `DATABASE_SCHEMA.md`
- Nếu repo dùng PostgreSQL/Prisma: mô tả schema theo domain dự án hiện có.
- Trình bày:
  - Bảng / quan hệ / kiểu dữ liệu chính
  - Indexes/unique constraints
  - Design decisions (UUID/cuid, soft delete nếu có, timestamps, cascade rules)
- Nếu repo **không có** MongoDB/InfluxDB: KHÔNG tạo schema cho chúng; chỉ ghi “Not in this project”.

3) `REDIS_KEY_DESIGN.md`
- Chỉ viết khi repo thật sự dùng Redis (dependency/usage).
- Liệt kê key patterns theo service/module đang có (không bịa 8 services nếu repo 1 service).
- Bao gồm:
  - naming convention, ví dụ keys
  - TTL rationale
  - shared keys (nếu có)
  - anti-patterns (high-cardinality keys, keys không version, KEYS * trong prod)

4) `LOCAL_DEV_STACK.md`
- Hướng dẫn local dev end-to-end:
  - prerequisites (Node version, Docker Desktop)
  - cách tạo env
  - migrate DB
  - chạy server dev
  - truy cập swagger/health
- Nếu có worker/queue, mô tả cách chạy.

5) `docker-compose.yml` + `.env.example` + `DOCKER_README.md`
- Compose chỉ include những thành phần dự án cần (ví dụ: postgres + redis). Tránh “20 containers” nếu không cần.
- Có healthchecks cho từng container.
- Dùng volume đặt tên rõ.
- `.env.example` cho docker: tách rõ `DATABASE_URL`, `REDIS_URL`, `PORT`.
- `DOCKER_README.md`:
  - `docker compose up -d`
  - `docker compose logs -f`
  - reset DB/volumes

6) (Tuỳ chọn) Chuyển đổi docs từ `.docx/.xlsx` sang Markdown
- Chỉ làm nếu trong repo có thư mục chứa các file đó.
- Quy tắc chuyển đổi:
  - giữ heading structure
  - bảng excel → markdown table
  - ảnh/đính kèm: ghi chú đường dẫn

### 3) Format & chất lượng
- Mỗi tài liệu phải có mục “Assumptions” (ngắn) nếu thiếu thông tin.
- Có checklist “How to verify” (3–6 bước) cho local dev.
- Đừng viết quá dài: ưu tiên thực dụng, copy-paste runnable.

### 4) Output
- Hãy trả về:
  1) Danh sách file sẽ tạo/cập nhật
  2) Nội dung đầy đủ cho từng file (Markdown)
  3) Ghi chú rủi ro/điểm cần người dùng xác nhận (nếu có)

## END PROMPT
