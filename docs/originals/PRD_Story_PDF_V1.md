PRODUCT REQUIREMENTS DOCUMENT
Story to PDF Platform (Anonymous Mode)
Version 1.1
May 2026

| SCOPE NOTE | Phạm vi tài liệu: **anonymous mode** — truy cập và sử dụng ngay, **không cần tài khoản**. |
| --- | --- |


1. Problem Framing

Story to PDF Platform giải quyết ba bài toán cốt lõi cho người đọc truyện web:

| Pain Point | Mô tả vấn đề | Giải pháp |
| --- | --- | --- |
| Đọc online phân tán | Giữ nhiều tab, mất tập trung, không đọc offline. | Nhập URL → crawl TOC + chapters → lưu trữ và cung cấp offline. |
| Không có định dạng tải về | Website truyện thiếu export file, không có định dạng đọc sách chuẩn. | PDF Generator: bìa + mục lục + đánh trang → tải về đọc offline. |
| Crawl chậm & không ổn định | Crawl thủ công mất thời gian, dễ fail, khó theo dõi tiến trình. | Async Jobs (CrawlJob/PdfJob) + SSE progress + retry + lỗi rõ ràng. |


2. User Personas

| Persona | Mô tả | Mục tiêu |
| --- | --- | --- |
| Visitor/Reader | Người dùng truy cập web, không cần tài khoản. | Nhập URL → theo dõi crawl → tạo PDF → tải về. |


3. Objectives & Success Metrics

| Objective | KPI / Metric | Target |
| --- | --- | --- |
| API Responsiveness | p95 response time (read endpoints) | < 500ms |
| Job Throughput | Job creation latency (enqueue & return) | < 200ms |
| Crawl Reliability | Chapter fetch success rate | > 95% |
| PDF Quality | PDF generation success rate | > 99% (khi chapters sẵn sàng) |
| Download Speed | PDF download start time | < 1 giây |
| Reliability | Core service uptime | 99.9% |


4. Scope Control

In Scope — MVP (Phase 1)
- Story ingest từ URL: create, list, detail, delete
- CrawlJob async: crawl TOC + chapters; progress qua SSE; retry; cancel best-effort
- Chapter content: lưu text/HTML + wordCount; đọc nội dung
- PdfJob async: generate PDF; progress qua SSE
- PDF download từ local storage
- Health endpoint + Swagger

In Scope — Advanced (Phase 2)
- Rate limiting theo IP và/hoặc session cookie
- Storage provider MinIO/S3 + signed URL
- Webhook callback khi job hoàn thành
- (Nếu cần privacy) accessKey theo story/job (không gắn danh tính)

Out of Scope

| Feature bị cắt | Lý do |
| --- | --- |
| User accounts + role management | Anonymous mode: không quản lý danh tính/người dùng. |
| Administration UI / privileged endpoints | MVP không có tầng quản trị. |
| Browser rendering (Puppeteer/Playwright) | Nặng tài nguyên, không cần cho MVP. |
| Scheduled auto-crawl (cron) | MVP để user chủ động trigger. |
| Mobile app native | Chỉ backend + web demo. |
| Payment / Premium | Ngoài scope. |


5. User Journey & Edge Cases

Happy Path
1) Truy cập web
2) Nhập URL truyện → tạo Story (status: pending)
3) Tạo CrawlJob → theo dõi SSE
4) Story ready → xem TOC/chapters
5) Tạo PdfJob → theo dõi SSE
6) PDF ready → download

Edge Cases
- URL đã tồn tại:
  - Option A: trả `409 STORY_ALREADY_EXISTS`
  - Option B: trả story hiện có (idempotent create)
- Chapter fail: chapter.status=failed, job tiếp tục
- Source bị block: backoff + retry, ghi errorMessage
- PDF khi thiếu chapter: render phần có, ghi chú thiếu chương
- Cancel job: cập nhật status=cancelled


6. Functional Requirements

| Feature | Acceptance Criteria |
| --- | --- |
| Anonymous access | Không yêu cầu danh tính/tài khoản cho endpoints MVP. |
| Story management | Create/list/detail/delete story. PATCH metadata (title/author/language). |
| Crawl engine | 3 mode: toc-only / chapters-only / toc-and-chapters. Retry max 3 (exp backoff). SSE progress. Cancel best-effort. |
| Chapter content | Lưu contentText/contentHtml/wordCount. Read endpoint trả nội dung. |
| PDF generation | includeCover/includeToc + (optional) chọn subset chapters. SSE progress. |
| PDF download | Stream PDF với Content-Type `application/pdf`. Kiểm tra expiresAt (nếu có). |
| Health | GET /health trả status và timestamp. |


7. Non-Functional Requirements

| Category | Requirement | Target |
| --- | --- | --- |
| Performance | p95 read latency | < 500ms |
| Performance | Job creation | < 200ms |
| Reliability | Uptime | 99.9% |
| Security | Anonymous model | Chống abuse bằng input validation + rate limiting (Phase 2) |
| Security | Data exposure | ID là opaque (cuid) để giảm đoán mò; **không đảm bảo privacy** nếu ai đó biết ID |
| Observability | Logging | CorrelationId trong log request + worker |
| Resilience | Retry | Exponential backoff, max 3 |
| Storage | Local filesystem | Sanitize storageKey, chặn path traversal |


8. System Architecture (Single Service)

| Module | Owns |
| --- | --- |
| Story | Story/TocItem/Chapter metadata |
| Content | ChapterContent |
| Crawl | CrawlJob state + progress |
| PDF | PdfJob + PdfFile metadata + file storage |


9. API Design Summary

- Base URL: `/api/v1`
- Protocols:
  - REST (JSON): CRUD + job management
  - SSE: progress stream
  - HTTP binary: download PDF
- Response envelope:
```json
{ "success": true, "data": {}, "message": "optional" }
```


10. Risks & Trade-offs

| Risk | Mô tả | Mitigation |
| --- | --- | --- |
| Không có danh tính → không privacy | Ai có ID có thể truy cập. | ID opaque + rate limit; Phase 2: accessKey nếu cần. |
| Scraping bị block | 403/CAPTCHA/429. | User-agent rotation, delay, concurrency thấp, backoff. |
| PDF quá lớn | Truyện dài → file rất lớn. | Cho phép chọn range chapters (optional). |
| Local storage đầy | Nhiều PDF. | expiresAt + cleanup job (Phase 2). |


11. Phased Delivery Plan

| Phase | Thời gian (ước tính) | Deliverable |
| --- | --- | --- |
| Phase 0 | Tuần 1 | Schema + Swagger + health + scaffolding |
| Phase 1 | Tuần 2-4 | Story ingest + crawl worker + pdf worker + download |
| Phase 2 (optional) | — | Rate limit, MinIO/S3, signed URL, optional accessKey |


— End of Document —
