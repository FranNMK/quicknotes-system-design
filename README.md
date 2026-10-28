# QuickNotes - Distributed System Design & API Client

[![QuickNotes Architecture](https://img.shields.io/badge/System%20Design-1M%20Users-indigo.svg)](#system-architecture)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue.svg)](#api-client-overview)
[![API Status](https://img.shields.io/badge/Mock%20API-JSONPlaceholder-green.svg)](https://jsonplaceholder.typicode.com)

A comprehensive systems engineering and client implementation project transitioning **QuickNotes** from a single-browser prototype into a resilient, enterprise-grade cloud service supporting **1,000,000+ registered users**.

This project delivers two interconnected halves:
1. **Interactive API Client**: A zero-dependency frontend application (`index.html`, `style.css`, `api.js`) demonstrating end-to-end RESTful communication (GET, POST, DELETE), user input validation, XSS prevention, and deterministic UI state transitions using JSONPlaceholder.
2. **Backend Engineering Specifications**: A trio of detailed technical design documents outlining the production REST API contracts, relational database schema, load calculations, and high-availability distributed architecture.

---

## Technical Design Documents

The complete backend architecture is documented inside the [`docs/`](docs/) directory:

- 📑 **[API Design Document](docs/api-design.md)**: RESTful endpoint specifications (8 endpoints), JSON request/response contracts for creating and listing notes, query parameters, pagination, and unified error response schemas for HTTP status codes `400`, `401`, `403`, `404`, and `500`.
- 🗄️ **[Data Model Document](docs/data-model.md)**: Relational schema design for `users`, `notes`, `tags`, and `note_tags`. Includes full PostgreSQL `CREATE TABLE` DDL with cascading foreign keys, $1:N$ and $M:N$ relationship definitions, production B-tree index justifications, multi-table JOIN queries, and an architectural justification for choosing SQL over NoSQL.
- 🏗️ **[System Architecture Document](docs/architecture.md)**: System design baseline for 1M users (200k DAU). Features detailed traffic calculations (reads/sec, writes/sec, and annual storage), complete architecture diagrams (DNS, CDN, Load Balancer, App Servers, Redis Cache, Primary DB with Read Replica, Message Queue, and Background Worker), step-by-step request flow traces, architectural trade-offs, and single point of failure (SPOF) mitigation strategies.

---

## API Client Overview

The frontend client serves as a working prototype to validate asynchronous API communication patterns:
- **GET Request**: Loads 10 notes from `https://jsonplaceholder.typicode.com/posts?_limit=10` and renders each title and body.
- **POST Request**: Validates that note titles are non-empty and under 100 characters before sending `{ title, body, userId: 1 }` to the server. Dynamically prepends newly created notes to the feed and displays the server response status (`status 201, id 101`).
- **DELETE Request**: Dispatches `DELETE /posts/{id}` requests, gracefully removes deleted items from the DOM, and displays an empty state if all notes are cleared.
- **UI State Machine**: Explicitly handles **Loading**, **Success**, **Error**, and **Empty** states with distinct visual styling.
- **Defensive Engineering**:
  - Buttons are disabled during network requests to prevent duplicate submissions or race conditions.
  - All dynamic data is inserted using `textContent` strictly to eliminate Cross-Site Scripting (XSS) risks.
  - JSONPlaceholder mock behavior (non-persistent storage and simulated deletions) is documented directly in the codebase.

---

## How to Run the API Client

The API client runs natively in any modern web browser without requiring external build tools or node module installations.

### Option 1: Python Built-In Server (Recommended)
Run the following command from the root of this repository:
```bash
python3 -m http.server 8080
```
Then open your browser and navigate to:
```
http://localhost:8080
```

### Option 2: Node.js / `npx serve`
```bash
npx serve .
```

### Option 3: Direct File Opening
You can also open `index.html` directly in your browser:
```bash
# Linux
xdg-open index.html

# macOS
open index.html
```

---

## What I Learned

1. **Robust Asynchronous State Handling & Defensive DOM Manipulation**:
   Building the API client reinforced the importance of encapsulating HTTP logic in a reusable `request()` wrapper that checks `response.ok` and normalizes error propagation. Managing the full lifecycle of states—loading, success, error, and empty—while disabling interactive buttons during in-flight promises creates an intuitive, race-condition-free user experience. Crucially, enforcing `textContent` over `innerHTML` guarantees that user-provided titles and bodies cannot execute arbitrary script injections (XSS).

2. **Relational Schema Normalization & Indexing Strategy**:
   Designing the QuickNotes schema clarified the practical trade-offs between SQL and NoSQL. Managing many-to-many relationships (notes and tags) through a junction table (`note_tags`) with cascading foreign keys (`ON DELETE CASCADE`) ensures rock-solid referential integrity and makes tag renames instantaneous. Furthermore, understanding query access patterns showed why compound indexes like `idx_notes_user_updated (user_id, updated_at DESC)` are vital: they allow PostgreSQL to satisfy both equality filtering and descending sort orders in a single sequential index scan, avoiding expensive filesort operations at scale.

3. **Distributed System Capacity Planning & High-Availability Architecture**:
   Modeling traffic and storage for 1,000,000 users translated abstract system design concepts into concrete mathematics. Estimating 23 reads/sec average (70 reads/sec peak), 4.6 writes/sec average (14 writes/sec peak), and ~228 GB of annual storage demonstrated that modern relational databases can easily handle write volume when paired with read replicas. Layering a CDN for static assets, an in-memory Redis cluster for hot note lookups (sub-5ms response), and a message queue for asynchronous workers guarantees that the system achieves sub-50ms read latency with no single point of failure (SPOF).
