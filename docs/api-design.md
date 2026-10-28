# QuickNotes REST API Design Specification

**Target Version:** v1.0.0  
**Base URL:** `https://api.quicknotes.io/v1`  
**Protocol:** HTTPS / JSON (RESTful)  
**Authentication:** HTTP Bearer Token (`Authorization: Bearer <jwt_token>`)

---

## 1. Overview & Architectural Principles

The QuickNotes API is built to support a globally distributed note-taking service serving 1,000,000+ users. It follows RESTful design principles:
- **Resource-Oriented URLs**: Nouns represent resources (e.g., `/notes`, `/tags`), not actions.
- **Standard HTTP Methods**: `GET` for safe retrieval, `POST` for creation, `PUT`/`PATCH` for updates, and `DELETE` for removal.
- **Stateless Communication**: Every request carries complete authentication and context via JWT tokens.
- **Consistent Response Envelopes**: All payloads use consistent top-level JSON formatting, ISO 8601 UTC timestamps, and standardized error schemas.
- **Data Protection**: Strict tenant isolation prevents cross-account data leakage; users can only interact with their own notes and tags.

---

## 2. API Endpoints Summary

The table below describes the primary REST endpoints for QuickNotes:

| Method | Endpoint Path | Description | Success Status | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notes` | List notes for authenticated user (supports search, tag filter, pagination) | `200 OK` | Yes |
| `POST` | `/api/v1/notes` | Create a new note with title, body, and optional tags | `201 Created` | Yes |
| `GET` | `/api/v1/notes/{id}` | Retrieve details of a specific note by ID | `200 OK` | Yes |
| `PUT` | `/api/v1/notes/{id}` | Replace an entire note (full update) | `200 OK` | Yes |
| `PATCH` | `/api/v1/notes/{id}` | Update specific fields of a note (partial update) | `200 OK` | Yes |
| `DELETE` | `/api/v1/notes/{id}` | Permanently delete a note by ID | `204 No Content` | Yes |
| `GET` | `/api/v1/tags` | List all tags created by the authenticated user | `200 OK` | Yes |
| `POST` | `/api/v1/tags` | Create a new tag for categorizing notes | `201 Created` | Yes |

---

## 3. Request & Response Examples

### 3.1 Create a Note (`POST /api/v1/notes`)

Creates a new note for the authenticated user.

#### Request Headers
```http
POST /api/v1/notes HTTP/1.1
Host: api.quicknotes.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

#### Request JSON Payload
```json
{
  "title": "Distributed Caching Strategies",
  "body": "Compare Cache-Aside vs Write-Through patterns. Redis latency benchmark target is under 5ms.",
  "tag_ids": [12, 45],
  "is_pinned": true
}
```

#### Response: `201 Created`
```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: /api/v1/notes/10482
```
```json
{
  "data": {
    "id": 10482,
    "user_id": 901,
    "title": "Distributed Caching Strategies",
    "body": "Compare Cache-Aside vs Write-Through patterns. Redis latency benchmark target is under 5ms.",
    "is_pinned": true,
    "tags": [
      {
        "id": 12,
        "name": "architecture",
        "color": "#4f46e5"
      },
      {
        "id": 45,
        "name": "backend",
        "color": "#0ea5e9"
      }
    ],
    "created_at": "2026-10-28T22:30:00Z",
    "updated_at": "2026-10-28T22:30:00Z"
  }
}
```

---

### 3.2 List Notes (`GET /api/v1/notes`)

Returns a paginated list of notes belonging to the caller, sorted by most recently updated.

#### Query Parameters
- `page` (integer, optional, default: `1`): Current page number.
- `limit` (integer, optional, default: `20`, max: `100`): Items per page.
- `tag` (string, optional): Filter notes tagged with a specific tag name.
- `search` (string, optional): Full-text search across titles and note bodies.
- `sort` (string, optional, default: `-updated_at`): Sort field and order (`-` indicates descending).

#### Request Headers
```http
GET /api/v1/notes?page=1&limit=2&tag=architecture HTTP/1.1
Host: api.quicknotes.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

#### Response: `200 OK`
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```
```json
{
  "data": [
    {
      "id": 10482,
      "user_id": 901,
      "title": "Distributed Caching Strategies",
      "body": "Compare Cache-Aside vs Write-Through patterns. Redis latency benchmark target is under 5ms.",
      "is_pinned": true,
      "tags": [
        {
          "id": 12,
          "name": "architecture",
          "color": "#4f46e5"
        }
      ],
      "created_at": "2026-10-28T22:30:00Z",
      "updated_at": "2026-10-28T22:30:00Z"
    },
    {
      "id": 10410,
      "user_id": 901,
      "title": "Database Read Replicas Setup",
      "body": "PostgreSQL streaming replication configuration with pgpool load balancer.",
      "is_pinned": false,
      "tags": [
        {
          "id": 12,
          "name": "architecture",
          "color": "#4f46e5"
        }
      ],
      "created_at": "2026-10-27T14:15:00Z",
      "updated_at": "2026-10-28T09:40:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "limit": 2,
    "total_records": 47,
    "total_pages": 24,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 3.3 Retrieve Single Note (`GET /api/v1/notes/{id}`)

#### Response: `200 OK`
```json
{
  "data": {
    "id": 10482,
    "user_id": 901,
    "title": "Distributed Caching Strategies",
    "body": "Compare Cache-Aside vs Write-Through patterns. Redis latency benchmark target is under 5ms.",
    "is_pinned": true,
    "tags": [
      {
        "id": 12,
        "name": "architecture",
        "color": "#4f46e5"
      }
    ],
    "created_at": "2026-10-28T22:30:00Z",
    "updated_at": "2026-10-28T22:30:00Z"
  }
}
```

---

### 3.4 Delete a Note (`DELETE /api/v1/notes/{id}`)

#### Response: `204 No Content`
```http
HTTP/1.1 204 No Content
```
*(No body returned on successful deletion)*

---

## 4. Error Status Codes & Response Format

The QuickNotes API adheres strictly to standard HTTP semantics. All error responses share a consistent JSON error envelope for predictable client parsing.

### 4.1 Supported HTTP Error Codes

| Status Code | Meaning | Typical Trigger Scenario |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Client Validation Error | Missing required `title`, title exceeds 100 characters, or malformed JSON payload. |
| **`401 Unauthorized`** | Authentication Failure | Missing `Authorization` header, invalid JWT signature, or expired session token. |
| **`403 Forbidden`** | Authorization Denial | Valid user credentials, but user attempts to view, modify, or delete another user's note. |
| **`404 Not Found`** | Resource Missing | The requested `note_id` does not exist in the database or has been deleted. |
| **`500 Internal Server Error`** | Server / Database Error | Unhandled backend exception, database connection timeout, or upstream network failure. |

---

### 4.2 Standard Error Response Schema

```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable summary of the error.",
    "status": 400,
    "details": [
      {
        "field": "title",
        "issue": "exceeds_maximum_length",
        "description": "Title cannot exceed 100 characters."
      }
    ],
    "timestamp": "2026-10-28T22:30:00Z",
    "request_id": "req_8f102a39c4d2"
  }
}
```

---

### 4.3 Error Examples

#### 1. `400 Bad Request` (Validation Failed)
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request body failed schema validation.",
    "status": 400,
    "details": [
      {
        "field": "title",
        "issue": "required",
        "description": "Note title is mandatory and cannot be empty."
      }
    ],
    "timestamp": "2026-10-28T22:30:00Z",
    "request_id": "req_1a4b2c3d"
  }
}
```

#### 2. `401 Unauthorized` (Invalid/Missing Token)
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Bearer token missing or expired.",
    "status": 401,
    "timestamp": "2026-10-28T22:30:00Z",
    "request_id": "req_2b5c3d4e"
  }
}
```

#### 3. `403 Forbidden` (Unauthorized Resource Access)
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json
```
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access note #8721.",
    "status": 403,
    "timestamp": "2026-10-28T22:30:00Z",
    "request_id": "req_3c6d4e5f"
  }
}
```

#### 4. `404 Not Found` (Note Does Not Exist)
```http
HTTP/1.1 404 Not Found
Content-Type: application/json
```
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Note with ID #99999 was not found.",
    "status": 404,
    "timestamp": "2026-10-28T22:30:00Z",
    "request_id": "req_4d7e5f6a"
  }
}
```

#### 5. `500 Internal Server Error` (Database Fault)
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
```
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred while processing your request. Please try again later.",
    "status": 500,
    "timestamp": "2026-10-28T22:30:00Z",
    "request_id": "req_5e8f6a7b"
  }
}
```
