# QuickNotes Data Model Specification

This document details the relational data model designed for QuickNotes, supporting 1,000,000+ active users. It outlines the schema architecture, entity relationships, DDL creation scripts, production indexing strategy, and technical justification for choosing a relational SQL database.

---

## 1. Entities & Schema Definition

The QuickNotes relational model consists of four core entities:

```
+---------------+        1 : N        +---------------+
|     users     |-------------------->|     notes     |
+---------------+                     +---------------+
        |                                     |
        | 1 : N                               | M : N
        v                                     v
+---------------+        M : N        +---------------+
|     tags      |-------------------->|   note_tags   |
+---------------+                     +---------------+
```

### 1.1 `users`
Represents individual account holders.
- `id` (`BIGSERIAL`, PK): Unique sequential integer identifier.
- `email` (`VARCHAR(255)`, UNIQUE, NOT NULL): User's unique login email.
- `password_hash` (`VARCHAR(255)`, NOT NULL): Argon2id or bcrypt hashed credentials.
- `name` (`VARCHAR(100)`, NOT NULL): Display name.
- `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Timestamp of account creation.
- `updated_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Timestamp of last profile update.

### 1.2 `notes`
Represents individual note documents authored by users.
- `id` (`BIGSERIAL`, PK): Unique note record identifier.
- `user_id` (`BIGINT`, FK -> `users.id`, NOT NULL): Account that owns this note.
- `title` (`VARCHAR(100)`, NOT NULL): Note headline (constrained to 100 characters).
- `body` (`TEXT`, NULL): Arbitrary-length markdown or plain text note content.
- `is_pinned` (`BOOLEAN`, NOT NULL, DEFAULT `FALSE`): Flag indicating if note is pinned to top.
- `is_archived` (`BOOLEAN`, NOT NULL, DEFAULT `FALSE`): Soft-archive flag.
- `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Timestamp when note was created.
- `updated_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Timestamp when note was last modified.

### 1.3 `tags`
Represents user-defined taxonomy labels for organizing notes.
- `id` (`BIGSERIAL`, PK): Unique tag identifier.
- `user_id` (`BIGINT`, FK -> `users.id`, NOT NULL): Owner of the tag (tags are user-scoped).
- `name` (`VARCHAR(50)`, NOT NULL): Human-readable tag label (e.g., "work", "ideas").
- `color` (`VARCHAR(7)`, NOT NULL, DEFAULT `'#4f46e5'`): Hex color code for UI display.
- `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Creation timestamp.

### 1.4 `note_tags`
Junction table resolving the many-to-many relationship between `notes` and `tags`.
- `note_id` (`BIGINT`, FK -> `notes.id`, NOT NULL): Associated note.
- `tag_id` (`BIGINT`, FK -> `tags.id`, NOT NULL): Associated tag.
- `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Association timestamp.
- **Primary Key**: Composite `(note_id, tag_id)`.

---

## 2. Entity Relationships & Cardinality

### 2.1 One-to-Many: `users` to `notes` ($1 : N$)
- **Concept**: A single user owns zero, one, or many notes. Every note belongs to exactly one user.
- **Implementation**: `notes.user_id` stores a Foreign Key referencing `users.id`.
- **Integrity Rule**: `ON DELETE CASCADE` ensures that if a user deletes their account, all associated notes are purged automatically to comply with privacy regulations (GDPR).

### 2.2 One-to-Many: `users` to `tags` ($1 : N$)
- **Concept**: Each user maintains their own personalized tag taxonomy.
- **Implementation**: `tags.user_id` stores a Foreign Key referencing `users.id`.
- **Integrity Rule**: A unique composite constraint `UNIQUE(user_id, name)` prevents duplicate tag names under the same account while allowing different users to use the same tag label.

### 2.3 Many-to-Many: `notes` to `tags` ($M : N$ via `note_tags`)
- **Concept**: A single note can carry multiple tags (e.g., a note tagged with both `#backend` and `#interview`), and a single tag can categorize multiple notes.
- **Implementation**: Normalized through the associative junction table `note_tags`.
- **Integrity Rule**: Composite primary key `(note_id, tag_id)` prevents assigning the same tag twice to the same note. Foreign keys with `ON DELETE CASCADE` guarantee that deleting a note or a tag immediately cleans up the corresponding junction rows without orphan records.

---

## 3. SQL DDL (`CREATE TABLE` Statements)

```sql
-- 1. Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notes Table
CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- 3. Tags Table
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#4f46e5',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tags_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    CONSTRAINT uq_user_tag_name 
        UNIQUE (user_id, name)
);

-- 4. Note Tags Junction Table (Many-to-Many)
CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id),
    CONSTRAINT fk_notetags_note
        FOREIGN KEY (note_id) 
        REFERENCES notes(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_notetags_tag
        FOREIGN KEY (tag_id) 
        REFERENCES tags(id) 
        ON DELETE CASCADE
);
```

---

## 4. Production Database Indexes & Justifications

To achieve sub-10ms query latency across millions of records, the following indexes are deployed:

```sql
-- Index 1: Optimize user note feeds sorted by recent updates
CREATE INDEX idx_notes_user_updated 
ON notes (user_id, is_archived, updated_at DESC);

-- Index 2: Optimize reverse tag lookups in junction table
CREATE INDEX idx_note_tags_tag_id 
ON note_tags (tag_id);

-- Index 3: Fast user email lookups during authentication
CREATE INDEX idx_users_email 
ON users (email);
```

### Index Justifications
1. **`idx_notes_user_updated` on `notes(user_id, is_archived, updated_at DESC)`**:
   - **Reason**: The most frequent query in QuickNotes is listing an active user's unarchived notes ordered by last modification date (`WHERE user_id = $1 AND is_archived = false ORDER BY updated_at DESC LIMIT 20`).
   - **Performance Impact**: Without this composite index, PostgreSQL would perform an index scan on `user_id` followed by a costly in-memory or disk sort (`Sort / FileSort`) over thousands of rows. The compound B-Tree index satisfies both the filter and the sort order directly in $O(\log N)$ time with a sequential forward index scan.

2. **`idx_note_tags_tag_id` on `note_tags(tag_id)`**:
   - **Reason**: The composite primary key `(note_id, tag_id)` automatically indexes queries starting with `note_id`. However, when a user clicks on a tag to view all associated notes (`WHERE tag_id = $1`), the composite index cannot be used efficiently because `tag_id` is the secondary column.
   - **Performance Impact**: This index enables immediate $O(\log N)$ lookups for tag-filtered views and ensures fast execution of cascading deletes when a tag is deleted.

---

## 5. Example SQL Queries

### Query 1: Create Note and Associate Tags (Transactional Insertion)
Inserts a new note for user ID `901` and associates it with tags `12` and `45`:

```sql
-- Step A: Insert note and return generated ID
WITH new_note AS (
    INSERT INTO notes (user_id, title, body, is_pinned)
    VALUES (901, 'System Architecture Review', 'Evaluate load balancer SSL termination.', TRUE)
    RETURNING id
)
-- Step B: Insert junction records
INSERT INTO note_tags (note_id, tag_id)
SELECT new_note.id, tag.id
FROM new_note, (VALUES (12::BIGINT), (45::BIGINT)) AS tag(id);
```

---

### Query 2: Fetch User Notes with Associated Tags (Multi-table `JOIN`)
Retrieves the most recent 10 notes for user `901` with tags aggregated into a clean JSON array:

```sql
SELECT 
    n.id AS note_id,
    n.title,
    n.body,
    n.is_pinned,
    n.updated_at,
    COALESCE(
        json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
        ) FILTER (WHERE t.id IS NOT NULL), 
        '[]'::json
    ) AS tags
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 901 
  AND n.is_archived = FALSE
GROUP BY n.id
ORDER BY n.is_pinned DESC, n.updated_at DESC
LIMIT 10 OFFSET 0;
```

---

### Query 3: Search Filtered by Tag Name and Keyword (`JOIN` + Search)
Finds all notes belonging to user `901` that carry the tag `'architecture'` and match keyword `'cache'`:

```sql
SELECT DISTINCT
    n.id,
    n.title,
    n.body,
    n.updated_at
FROM notes n
INNER JOIN note_tags nt ON n.id = nt.note_id
INNER JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 901
  AND t.name = 'architecture'
  AND (
      n.title ILIKE '%cache%' 
      OR n.body ILIKE '%cache%'
  )
ORDER BY n.updated_at DESC
LIMIT 20;
```

---

## 6. SQL vs. NoSQL Justification

QuickNotes selects a relational SQL engine (**PostgreSQL**) over a document or key-value NoSQL database (such as MongoDB or DynamoDB). The core justification rests on the following architectural realities:

1. **Strict Relational Topology & Normalization**:
   The domain consists of deeply interconnected entities: users own notes, users own tags, and notes share tags via a many-to-many relationship. In a NoSQL document database, tags would typically be denormalized as embedded arrays within each note document. Renaming a tag (e.g. from `#backend` to `#server`) would require a multi-document distributed write transaction across thousands of individual notes, leading to write amplification, inconsistency, and latency spikes. In PostgreSQL, a single update to `tags.name` updates one row in 1 millisecond.

2. **ACID Guarantees & Data Integrity**:
   Notes represent personal, critical user data. Foreign keys with `ON DELETE CASCADE` enforce referential integrity at the engine level, preventing orphaned junction rows or ghost tags. Relational ACID transactions guarantee that note creation and tag association occur atomically.

3. **Data Volume vs. Hardware Capacity**:
   With 1,000,000 registered users averaging 200 notes each, the total dataset is approximately 200,000,000 records (~100 GB of storage including indexes). A modern relational cluster (e.g., PostgreSQL on AWS RDS or Aurora with 64GB RAM and NVMe SSDs) easily caches hot working sets in memory and processes tens of thousands of QPS with sub-5ms latencies. Adding read replicas scales read traffic linearly without introducing the eventual consistency complexities or lack of relational joins inherent in NoSQL databases.
