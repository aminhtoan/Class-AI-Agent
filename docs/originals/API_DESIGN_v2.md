# API Design v2.1 — Story to PDF Backend (Anonymous Mode)
*Last updated: May 20, 2026*

| SCOPE NOTE | API public theo **anonymous mode**: dùng ngay, **không cần tài khoản**. Tài liệu này chỉ mô tả endpoints MVP + một số mở rộng Phase 2. |
| --- | --- |

---

## Goals
- REST API ổn định cho: ingest story từ URL, crawl chapters, generate PDF và tải về.
- Response envelope nhất quán, error có cấu trúc.
- Hỗ trợ async jobs (crawl + pdf) vì tác vụ có thể chậm.
- Real-time progress qua SSE (Server-Sent Events).

---

## Scope
Backed by PostgreSQL (Prisma models):
- `Story` + `TocItem` + `Chapter` + `ChapterContent`
- `CrawlJob`
- `PdfJob` + `PdfFile`

Not exposed via public API (internal only / future):
- `AuditLog`
- `User`

Out of scope:
- gRPC
- Multi-service topology

---

## Conventions

### Base URL
```
/api/v1
```

### Path & naming
- URL paths: kebab-case
- Collections: plural nouns (`/stories`, `/pdf-jobs`)
- Query params: camelCase
- Body fields: camelCase

### Response envelope

```json
// Success (single object)
{ "success": true, "data": {} }

// Success (list + pagination)
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

### HTTP status codes

| Code | Meaning |
| ---: | --- |
| 200 | OK — successful GET/PUT/PATCH |
| 201 | Created — successful POST |
| 204 | No Content — successful DELETE |
| 400 | Bad Request |
| 404 | Not Found |
| 409 | Conflict |
| 410 | Gone (expired) |
| 422 | Validation failed |
| 500 | Internal error |

### IDs
- Tất cả IDs là string (Prisma `cuid()`).
- Anonymous mode: ai có ID có thể truy cập resource; MVP **không đảm bảo privacy**.

### Pagination
- `page` (default 1), `limit` (default 20, max 100)
- Trả `pagination` trong envelope.

### Timeouts (targets)
- Read endpoints: p95 < 500ms
- Job creation: enqueue & return < 200ms

---

## Status enums

### `Story.status`
- `pending` — mới tạo, chưa crawl
- `crawling` — đang crawl
- `ready` — đã có TOC/chapters (đủ để generate PDF)
- `failed` — crawl thất bại

### `Chapter.status`
- `pending` — chưa fetch
- `fetched` — đã có nội dung
- `failed` — fetch thất bại

### `CrawlJob.status` / `PdfJob.status`
- `pending` — chờ trong queue
- `running` — đang xử lý
- `succeeded` — thành công
- `failed` — thất bại
- `cancelled` — đã huỷ

---

## Endpoints

### Health

#### `GET /health`

```json
// 200
{
  "success": true,
  "data": { "status": "ok", "timestamp": "2026-05-20T00:00:00.000Z" }
}
```

---

### Stories

#### `POST /stories`
Tạo story từ URL nguồn.

```json
// Request
{
  "sourceUrl": "https://example.com/story/abc",
  "title": "Optional",
  "author": "Optional",
  "language": "vi"
}

// 201
{
  "success": true,
  "data": {
    "id": "...",
    "sourceUrl": "...",
    "title": null,
    "author": null,
    "language": "vi",
    "status": "pending",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Errors:
- `422 VALIDATION_ERROR` (URL invalid)
- `409 STORY_ALREADY_EXISTS` (nếu policy không cho trùng sourceUrl)

Notes:
- Nếu muốn idempotent create: thay vì `409`, có thể trả về story hiện có (document rõ policy ở implementation).

---

#### `GET /stories`
Danh sách stories.

Query params:
| Param | Default | Description |
| --- | ---: | --- |
| `page` | `1` | page number |
| `limit` | `20` | items per page (max 100) |
| `status` | — | filter by status |
| `q` | — | search by title (optional) |

```json
// 200
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "author": "...",
      "sourceUrl": "...",
      "language": "vi",
      "status": "ready",
      "chapterCount": 120,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

#### `GET /stories/:id`

```json
// 200
{
  "success": true,
  "data": {
    "id": "...",
    "sourceUrl": "...",
    "title": "...",
    "author": "...",
    "language": "vi",
    "status": "ready",
    "chapterCount": 120,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Errors:
- `404 STORY_NOT_FOUND`

---

#### `PATCH /stories/:id`
Cập nhật metadata (partial update).

```json
// Request
{ "title": "Tên mới", "author": "Tác giả" }

// 200
{ "success": true, "data": { "id": "...", "title": "Tên mới", "author": "Tác giả", "updatedAt": "..." } }
```

Errors:
- `404 STORY_NOT_FOUND`
- `422 VALIDATION_ERROR`

---

#### `DELETE /stories/:id`
Xoá story (cascade TOC/chapters/jobs/files qua FK).

- Response: `204 No Content`

Errors:
- `404 STORY_NOT_FOUND`

---

### TOC & Chapters

#### `GET /stories/:id/toc`

```json
// 200
{
  "success": true,
  "data": [
    { "id": "...", "title": "Chương 1: ...", "url": "...", "position": 1 }
  ]
}
```

Errors:
- `404 STORY_NOT_FOUND`

---

#### `GET /stories/:id/chapters`

Query: `status` (optional), `page`, `limit`

```json
// 200
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "sourceUrl": "...",
      "position": 1,
      "status": "fetched"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
}
```

Errors:
- `404 STORY_NOT_FOUND`

---

#### `GET /chapters/:id`
Trả metadata chapter.

```json
// 200
{ "success": true, "data": { "id": "...", "storyId": "...", "title": "...", "position": 1, "status": "fetched" } }
```

Errors:
- `404 CHAPTER_NOT_FOUND`

---

#### `GET /chapters/:id/content`
Nội dung chapter (field lớn; nên bật gzip ở gateway/server).

```json
// 200
{
  "success": true,
  "data": {
    "chapterId": "...",
    "contentText": "...",
    "contentHtml": "...",
    "wordCount": 1234
  }
}
```

Errors:
- `404 CHAPTER_NOT_FOUND`
- `404 CONTENT_NOT_AVAILABLE`

---

### Crawl Jobs (async)

#### `POST /stories/:id/crawl-jobs`
Tạo crawl job và enqueue.

```json
// Request
{ "mode": "toc-only" | "chapters-only" | "toc-and-chapters" }

// 201
{
  "success": true,
  "data": {
    "id": "...",
    "storyId": "...",
    "status": "pending",
    "mode": "toc-and-chapters",
    "progressTotal": 0,
    "progressDone": 0,
    "createdAt": "..."
  }
}
```

Errors:
- `404 STORY_NOT_FOUND`
- `422 VALIDATION_ERROR`

---

#### `GET /stories/:id/crawl-jobs`
List crawl jobs theo story.

```json
// 200
{
  "success": true,
  "data": [
    { "id": "...", "status": "succeeded", "mode": "toc-and-chapters", "createdAt": "..." }
  ]
}
```

Errors:
- `404 STORY_NOT_FOUND`

---

#### `GET /crawl-jobs/:id`

```json
// 200
{
  "success": true,
  "data": {
    "id": "...",
    "storyId": "...",
    "status": "running",
    "mode": "toc-and-chapters",
    "progressTotal": 120,
    "progressDone": 45,
    "errorCode": null,
    "errorMessage": null,
    "startedAt": "...",
    "finishedAt": null
  }
}
```

Errors:
- `404 CRAWL_JOB_NOT_FOUND`

---

#### `POST /crawl-jobs/:id/cancel`
Huỷ job (best-effort).

```json
// 200
{ "success": true, "data": { "id": "...", "status": "cancelled" } }
```

Errors:
- `404 CRAWL_JOB_NOT_FOUND`
- `409 CANNOT_CANCEL_FINISHED_JOB`

---

#### `GET /crawl-jobs/:id/progress` — SSE
Stream để theo dõi progress realtime.

```
GET /api/v1/crawl-jobs/:id/progress
Accept: text/event-stream

// Server pushes:
data: {"progressDone":10,"progressTotal":120,"status":"running"}

data: {"progressDone":120,"progressTotal":120,"status":"succeeded"}
```

Client đóng kết nối sau khi nhận `status: succeeded | failed | cancelled`.

---

### PDF Jobs & Files (async)

#### `POST /stories/:id/pdf-jobs`
Tạo job generate PDF.

```json
// Request
{
  "includeCover": true,
  "includeToc": true,
  "chapterIds": []
}

// 201
{
  "success": true,
  "data": { "id": "...", "storyId": "...", "status": "pending", "createdAt": "..." }
}
```

Notes:
- `chapterIds: []` nghĩa là lấy tất cả chapters.

Errors:
- `404 STORY_NOT_FOUND`
- `422 VALIDATION_ERROR`
- `422 NO_CHAPTERS_AVAILABLE` (nếu policy strict; hoặc generate partial nếu policy lenient)

---

#### `GET /stories/:id/pdf-jobs`
List pdf jobs theo story.

```json
// 200
{ "success": true, "data": [ { "id": "...", "status": "succeeded", "createdAt": "..." } ] }
```

Errors:
- `404 STORY_NOT_FOUND`

---

#### `GET /pdf-jobs/:id`

```json
// 200
{
  "success": true,
  "data": {
    "id": "...",
    "storyId": "...",
    "status": "succeeded",
    "file": {
      "id": "...",
      "fileName": "story-abc.pdf",
      "fileSizeBytes": 2048000,
      "storageProvider": "local",
      "createdAt": "...",
      "expiresAt": null
    }
  }
}
```

Errors:
- `404 PDF_JOB_NOT_FOUND`

---

#### `GET /pdf-jobs/:id/progress` — SSE
Giống crawl-jobs SSE.

---

#### `GET /pdf-files/:id/download`
Tải file PDF.

- Response `200`, `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="..."`
- Local storage: map `storageKey` → filesystem path an toàn (chặn path traversal)

Errors:
- `404 PDF_FILE_NOT_FOUND`
- `410 PDF_FILE_EXPIRED`
- `500 STORAGE_FILE_MISSING`

---

#### `GET /pdf-files/:id/signed-url` *(Phase 2, cloud storage)*
Trả về signed URL tải trực tiếp từ storage provider.

```json
// 200
{
  "success": true,
  "data": { "url": "https://storage.example.com/...", "expiresAt": "..." }
}
```

Errors:
- `404 PDF_FILE_NOT_FOUND`
- `410 PDF_FILE_EXPIRED`

---

## Error codes (recommended)

| Code | When |
| --- | --- |
| `VALIDATION_ERROR` | Request body/query invalid |
| `STORY_NOT_FOUND` | Story id không tồn tại |
| `STORY_ALREADY_EXISTS` | Tạo story trùng policy |
| `CHAPTER_NOT_FOUND` | Chapter id không tồn tại |
| `CONTENT_NOT_AVAILABLE` | Chapter có metadata nhưng chưa có content |
| `CRAWL_JOB_NOT_FOUND` | CrawlJob id không tồn tại |
| `PDF_JOB_NOT_FOUND` | PdfJob id không tồn tại |
| `PDF_FILE_NOT_FOUND` | PdfFile id không tồn tại |
| `PDF_FILE_EXPIRED` | PdfFile hết hạn |
| `NO_CHAPTERS_AVAILABLE` | Không có chapters để render (policy strict) |
| `CANNOT_CANCEL_FINISHED_JOB` | Cancel job khi đã finished |
| `STORAGE_FILE_MISSING` | Metadata có nhưng file không tồn tại |

---

## Checklist

### Must-have (MVP)
- [x] Health
- [x] Story: create / list / detail / patch / delete
- [x] TOC + chapters: list + read content
- [x] Crawl: create job / list by story / poll job / cancel / SSE progress
- [x] PDF: create job / list by story / poll job / SSE progress / download

### Optional (Phase 2)
- [ ] Rate limiting per IP/session cookie
- [ ] Idempotency key cho job creation
- [ ] Cloud storage provider + signed URL
- [ ] Webhook khi job hoàn thành

---

## Implementation notes
- Validate input bằng schema (Zod) và trả `422` khi invalid.
- Không swallow errors; log có cấu trúc và không log dữ liệu nhạy cảm.
- SSE endpoint cần flush headers ngay để client biết kết nối thành công.
- Download endpoint: chống path traversal khi map `storageKey`.
- Tất cả timestamps ISO 8601 UTC.
