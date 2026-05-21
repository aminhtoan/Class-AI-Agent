# PRODUCT BACKLOG
## Story to PDF Platform (Anonymous Mode)
**Version 1.1 — Aligned to PRD V1.1**
*May 2026*

| SCOPE NOTE | Backlog theo **anonymous mode**: dùng ngay, **không cần tài khoản**. Tập trung luồng core: Story ingest → Crawl async → PDF generation → Download. |
| --- | --- |


## 1) NON-FUNCTIONAL REQUIREMENTS & SYSTEM BOUNDARIES

| Category | Constraint | Value / Rule |
| --- | --- | --- |
| SLO | API latency p95 (read endpoints) | < 500ms |
| SLO | Core service uptime | 99.9% |
| Timeout | Job creation (enqueue & return) | < 200ms |
| Timeout | Chapter fetch timeout | 10s trước khi retry |
| Validation | Input | Zod validation — 422 VALIDATION_ERROR |
| Abuse prevention | Anonymous model | Phase 1: basic throttling (optional). Phase 2: rate limit per IP/session cookie |
| Observability | Correlation | CorrelationId trong mọi log request và worker |
| Data safety | Sensitive data | Không lưu password/token; không log dữ liệu nhạy cảm |
| Resilience | Retry | Max 3 lần, Exponential Backoff (1s, 2s, 4s) |
| Resilience | Job resume | Server restart: resume từ chapter pending (idempotent) |
| Storage | PDF storage | Phase 1: local filesystem; Phase 2: MinIO/S3 |
| Security | File download | Sanitize storageKey; chống path traversal |


## 2) PRODUCT BACKLOG — PHASE 1 (MVP)

| PHASE 1 GOAL | Demo live 3 luồng core: (1) Story ingest, (2) Crawl async + SSE progress, (3) PDF generation + download. |
| --- | --- |


### EPIC 0: Foundation — Health + Swagger

#### User Story 0.1: Health Check
| Field | Content |
| --- | --- |
| Story | As a DevOps / Load Balancer, I want a health endpoint to verify the service is alive before routing traffic. |
| AC1 | Given GET /health. Then 200 với { status: "ok", timestamp: "..." }. |
| AC2 | Given service chưa sẵn sàng (DB down). Then 503 với status phù hợp. |
| Priority | High | Estimate: 1 SP |

#### User Story 0.2: Swagger Docs
| Field | Content |
| --- | --- |
| Story | As a Developer, I want Swagger documentation so I can test endpoints quickly. |
| AC1 | Swagger được mount tại `/api-docs`. |
| AC2 | Mọi endpoint MVP có mô tả request/response + error codes. |
| Priority | Medium | Estimate: 1 SP |


---

### EPIC 1: Story Management (Anonymous)

> Lưu ý: anonymous mode — mọi story/job được truy cập bằng **opaque id** (cuid). MVP không đảm bảo privacy.

#### User Story 1.1: Tạo Story từ URL
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to submit a story URL so the platform can start tracking and crawling it. |
| AC1 | Given URL hợp lệ. When POST /stories. Then tạo Story status=pending, trả id + sourceUrl + status. |
| AC2 | Given URL không hợp lệ (không phải http/https). Then 422 VALIDATION_ERROR. |
| AC3 | Given URL đã tồn tại (tùy quyết định): Then 409 STORY_ALREADY_EXISTS **hoặc** trả story hiện có (idempotent create). |
| Priority | High | Estimate: 3 SP |

#### User Story 1.2: List & Detail Story
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to see stories and their status so I can track progress. |
| AC1 | GET /stories trả danh sách (pagination page/limit, max 100). |
| AC2 | Filter ?status=ready hoạt động. |
| AC3 | GET /stories/:id trả story detail. |
| Priority | High | Estimate: 3 SP |

#### User Story 1.3: Cập nhật & Xoá Story
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to edit story metadata and delete stories I no longer need. |
| AC1 | PATCH /stories/:id cập nhật title/author/language (partial). |
| AC2 | DELETE /stories/:id xoá story và cascade dữ liệu liên quan. Response 204. |
| Priority | Medium | Estimate: 2 SP |


---

### EPIC 2: Crawl Engine — Async Job

| DESIGN NOTE | CrawlJob chạy async trong background worker. HTTP endpoint chỉ tạo job và enqueue. Client theo dõi tiến trình qua SSE. |
| --- | --- |

#### User Story 2.1: Tạo & Xem CrawlJob
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to start a crawl job and view its status. |
| AC1 | POST /stories/:id/crawl-jobs với mode hợp lệ tạo CrawlJob status=pending và trả về < 200ms. |
| AC2 | GET /crawl-jobs/:id trả status, progressTotal, progressDone, errorMessage. |
| Priority | High | Estimate: 5 SP |

#### User Story 2.2: Crawl TOC & Chapters (Worker)
| Field | Content |
| --- | --- |
| Story | As the System, I want to fetch TOC and chapter content reliably so readers can generate PDFs. |
| AC1 | mode=toc-and-chapters: fetch TOC → upsert TocItem → fetch chapters → lưu ChapterContent. |
| AC2 | Mỗi chapter fail sau 3 retry: chapter.status=failed, job vẫn tiếp tục. |
| AC3 | Khi xong: CrawlJob.status=succeeded, Story.status=ready. |
| Priority | High | Estimate: 13 SP |

#### User Story 2.3: Realtime Progress qua SSE
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to see crawl progress updating in realtime via SSE. |
| AC1 | GET /crawl-jobs/:id/progress stream event mỗi khi progressDone tăng. |
| AC2 | Khi job kết thúc: push event cuối và đóng kết nối. |
| Priority | High | Estimate: 5 SP |

#### User Story 2.4: Cancel CrawlJob
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to cancel a running crawl job. |
| AC1 | POST /crawl-jobs/:id/cancel chuyển status=cancelled (best-effort). |
| AC2 | Job đã finished → 409 CANNOT_CANCEL_FINISHED_JOB. |
| Priority | Medium | Estimate: 3 SP |


---

### EPIC 3: Chapter Content

#### User Story 3.1: Xem TOC & Chapters
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to browse TOC and chapters before generating a PDF. |
| AC1 | GET /stories/:id/toc trả TocItem sắp xếp theo position ASC. |
| AC2 | GET /stories/:id/chapters trả list chapters (pagination + filter status). |
| Priority | Medium | Estimate: 3 SP |

#### User Story 3.2: Đọc Nội dung Chapter
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to read a chapter's content in the app. |
| AC1 | GET /chapters/:id/content trả contentText/contentHtml/wordCount. |
| AC2 | Chapter chưa fetched → 404 CONTENT_NOT_AVAILABLE. |
| Priority | Medium | Estimate: 2 SP |


---

### EPIC 4: PDF Generation + Download

#### User Story 4.1: Tạo & Theo dõi PdfJob
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to request PDF generation and track its progress. |
| AC1 | POST /stories/:id/pdf-jobs tạo PdfJob status=pending và trả về < 200ms. |
| AC2 | GET /pdf-jobs/:id trả status và file metadata nếu succeeded. |
| Priority | High | Estimate: 5 SP |

#### User Story 4.2: PDF Render Engine (Worker)
| Field | Content |
| --- | --- |
| Story | As the System, I want to generate a well-formatted PDF from chapter content. |
| AC1 | includeCover=true: trang bìa (title/author). |
| AC2 | includeToc=true: mục lục. |
| AC3 | Chapter failed: bỏ qua nội dung nhưng ghi chú. |
| AC4 | Thành công: lưu file + tạo PdfFile record + PdfJob.status=succeeded. |
| Priority | High | Estimate: 8 SP |

#### User Story 4.3: PDF Progress qua SSE
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to see PDF progress via SSE. |
| AC1 | GET /pdf-jobs/:id/progress stream event theo progressDone/progressTotal. |
| Priority | High | Estimate: 3 SP |

#### User Story 4.4: Tải PDF
| Field | Content |
| --- | --- |
| Story | As a Reader, I want to download my generated PDF file. |
| AC1 | GET /pdf-files/:id/download stream file, set headers đúng. |
| AC2 | PdfFile không tồn tại → 404 PDF_FILE_NOT_FOUND. |
| AC3 | expiresAt đã qua → 410 PDF_FILE_EXPIRED. |
| Priority | High | Estimate: 3 SP |


---

## 3) PRODUCT BACKLOG — PHASE 2 (ADVANCED)

### EPIC 5: Abuse prevention + Storage

#### User Story 5.1: Rate limiting
| Field | Content |
| --- | --- |
| Story | As the Platform, I want rate limiting to prevent abuse in an anonymous model. |
| AC1 | > 100 req/min từ cùng IP → 429 TOO_MANY_REQUESTS. |
| AC2 | Limit job creation per IP/session (VD: 5 crawl jobs/10 phút). |
| Priority | Medium | Estimate: 3 SP |

#### User Story 5.2: MinIO/S3 storage
| Field | Content |
| --- | --- |
| Story | As the Platform, I want to store PDFs on MinIO/S3 to scale horizontally. |
| AC1 | storageProvider=s3 upload/download qua SDK. |
| AC2 | Signed URL (TTL 15 phút) cho download. |
| Priority | Medium | Estimate: 8 SP |


---

## 4) BACKLOG SUMMARY

| Epic | Phase | Total SP | Priority |
| --- | --- | ---: | --- |
| EPIC 0: Foundation | Phase 1 | 2 | High |
| EPIC 1: Story Management | Phase 1 | 8 | High |
| EPIC 2: Crawl Engine | Phase 1 | 26 | High |
| EPIC 3: Chapter Content | Phase 1 | 5 | Medium |
| EPIC 4: PDF + Download | Phase 1 | 19 | High |
| EPIC 5: Abuse + Storage | Phase 2 | 11 | Medium |
| **TOTAL Phase 1 MVP** | — | **60 SP** | — |


---

## 5) DEFINITION OF DONE (DoD)

| # | Tiêu chí |
| --- | --- |
| 1 | Endpoint documented trong Swagger |
| 2 | AC được verify (manual hoặc test) |
| 3 | Error handling chuẩn + không swallow errors |
| 4 | Không log dữ liệu nhạy cảm |
| 5 | Worker jobs không crash khi nguồn web fail (retry/backoff) |
| 6 | Local dev chạy được end-to-end |

— End of Document —
