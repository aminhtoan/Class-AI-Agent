# USE CASE SPECIFICATION
## Story to PDF Platform (Anonymous Mode)
**Version 1.1**
*May 2026*

| SCOPE NOTE | Use case theo **anonymous mode**: dùng ngay, **không cần tài khoản**. Tập trung vào crawl + pdf + download. |
| --- | --- |


## 1) Actors

| Actor | Description |
| --- | --- |
| Reader (Anonymous) | Người dùng truy cập web, không cần tài khoản. |
| System Worker | Background worker thực hiện crawl & PDF generation. |
| External Story Site | Website nguồn để crawl TOC/chapters. |


## 2) Preconditions (Global)

| Item | Condition |
| --- | --- |
| Network | Service reachable over HTTP |
| Storage | Local filesystem writable (Phase 1) |
| Database | PostgreSQL available |
| Identity | **None required** |


## 3) Use Cases

### UC-01: Submit Story URL
| Field | Content |
| --- | --- |
| Goal | Tạo story record từ URL nguồn. |
| Primary Actor | Reader (Anonymous) |
| Trigger | User paste URL và bấm “Create”. |
| Preconditions | URL là http/https. |
| Postconditions | Story created (status=pending) hoặc trả story hiện có. |
| Main Flow | 1) User nhập URL. 2) System validate URL. 3) System tạo Story. 4) System trả Story id. |
| Alternate Flows | A1) URL invalid → 422 VALIDATION_ERROR. A2) URL exists → 409 hoặc return existing story (idempotent). |


### UC-02: Start Crawl Job
| Field | Content |
| --- | --- |
| Goal | Enqueue crawl job để fetch TOC/chapters. |
| Primary Actor | Reader (Anonymous) |
| Supporting Actor | System Worker, External Story Site |
| Trigger | User click “Crawl”. |
| Preconditions | Story tồn tại. |
| Postconditions | CrawlJob created; worker bắt đầu xử lý. |
| Main Flow | 1) User chọn mode. 2) System tạo CrawlJob status=pending. 3) Worker picks job. 4) Worker fetch TOC & chapters (tùy mode). 5) Worker update progress. 6) Worker mark job succeeded/failed. |
| Alternate Flows | A1) Story not found → 404 STORY_NOT_FOUND. A2) External site timeout → retry/backoff; chapter fail marked failed. A3) Worker crash → job resume (best-effort). |


### UC-03: Track Crawl Progress via SSE
| Field | Content |
| --- | --- |
| Goal | Xem tiến trình crawl realtime. |
| Primary Actor | Reader (Anonymous) |
| Supporting Actor | System Worker |
| Trigger | Client mở progress view. |
| Preconditions | CrawlJob tồn tại. |
| Postconditions | Client nhận stream events cho đến khi job kết thúc. |
| Main Flow | 1) Client connect SSE endpoint. 2) System emits progress events. 3) Khi job finished, emit final event + close. |
| Alternate Flows | A1) Job not found → 404 CRAWL_JOB_NOT_FOUND. A2) Client disconnect → user reconnect; job vẫn chạy. |


### UC-04: Browse TOC and Chapters
| Field | Content |
| --- | --- |
| Goal | Xem TOC, list chapters và trạng thái fetch. |
| Primary Actor | Reader (Anonymous) |
| Trigger | User mở story detail. |
| Preconditions | Story tồn tại; TOC có thể chưa đầy đủ nếu crawl đang chạy. |
| Postconditions | User thấy TOC/chapters. |
| Main Flow | 1) Client gọi GET TOC. 2) Client gọi GET chapters. 3) System trả dữ liệu sắp xếp theo position. |
| Alternate Flows | A1) Story not found → 404 STORY_NOT_FOUND. |


### UC-05: Read Chapter Content
| Field | Content |
| --- | --- |
| Goal | Xem nội dung 1 chapter đã crawl. |
| Primary Actor | Reader (Anonymous) |
| Trigger | User click chapter. |
| Preconditions | ChapterContent đã tồn tại. |
| Postconditions | Client render contentText/contentHtml. |
| Main Flow | 1) Client gọi GET chapter content. 2) System trả content. |
| Alternate Flows | A1) Content chưa available → 404 CONTENT_NOT_AVAILABLE. |


### UC-06: Start PDF Job
| Field | Content |
| --- | --- |
| Goal | Enqueue PDF generation job cho 1 story. |
| Primary Actor | Reader (Anonymous) |
| Supporting Actor | System Worker |
| Trigger | User click “Generate PDF”. |
| Preconditions | Story có ít nhất một số chapters ready (hoặc allow partial). |
| Postconditions | PdfJob created; worker bắt đầu render; PdfFile được tạo khi xong. |
| Main Flow | 1) User chọn options (includeCover/includeToc). 2) System tạo PdfJob pending. 3) Worker render PDF. 4) Worker lưu file + tạo PdfFile record. 5) Job succeeded. |
| Alternate Flows | A1) Story not found → 404 STORY_NOT_FOUND. A2) No chapters ready → 422 NO_CHAPTERS_AVAILABLE (nếu policy strict) hoặc generate partial (policy lenient). |


### UC-07: Track PDF Progress via SSE
| Field | Content |
| --- | --- |
| Goal | Xem tiến trình render PDF realtime. |
| Primary Actor | Reader (Anonymous) |
| Supporting Actor | System Worker |
| Trigger | Client mở progress view. |
| Preconditions | PdfJob tồn tại. |
| Postconditions | Client nhận stream events cho đến khi job kết thúc. |
| Main Flow | 1) Client connect SSE endpoint. 2) System emits progress events. 3) Finish event + close. |
| Alternate Flows | A1) Job not found → 404 PDF_JOB_NOT_FOUND. |


### UC-08: Download PDF
| Field | Content |
| --- | --- |
| Goal | Download file PDF đã được tạo. |
| Primary Actor | Reader (Anonymous) |
| Trigger | User click “Download”. |
| Preconditions | PdfFile exists; file exists on disk. |
| Postconditions | File stream to client. |
| Main Flow | 1) Client gọi download endpoint. 2) System validate file exists. 3) System stream `application/pdf` với filename. |
| Alternate Flows | A1) PdfFile not found → 404 PDF_FILE_NOT_FOUND. A2) File missing → 500 STORAGE_FILE_MISSING. A3) expiresAt passed → 410 PDF_FILE_EXPIRED. |


### UC-09: Cancel Job (Optional)
| Field | Content |
| --- | --- |
| Goal | Cancel crawl/pdf job đang chạy (best-effort). |
| Primary Actor | Reader (Anonymous) |
| Trigger | User click “Cancel”. |
| Preconditions | Job đang running/pending. |
| Postconditions | Job status=cancelled; worker dừng khi có thể. |
| Main Flow | 1) Client gọi cancel endpoint. 2) System set status=cancelled. 3) Worker checks flag and exits gracefully. |
| Alternate Flows | A1) Job finished → 409 CANNOT_CANCEL_FINISHED_JOB. |


## 4) Business Rules

| Rule | Description |
| --- | --- |
| BR-01 | Anonymous model: endpoints MVP public. |
| BR-02 | IDs are opaque (cuid). Không dùng incremental ID. |
| BR-03 | Chapter failures không block toàn job; ghi error rõ ràng. |
| BR-04 | PDF có thể generate partial nếu có chapters failed (policy lenient). |
| BR-05 | Progress tracking qua SSE; reconnect được. |


## 5) Non-Functional Notes

| Topic | Note |
| --- | --- |
| Rate limiting | Nên bật ở Phase 2 để chống abuse. |
| Storage cleanup | Có expiresAt + cleanup job để tránh đầy disk (Phase 2). |
| Observability | Structured logs + correlationId. |

— End of Document —
