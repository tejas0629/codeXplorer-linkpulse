# LinkPulse Database Documentation

## 1. Overview

LinkPulse uses PostgreSQL hosted on Supabase, managed with Prisma ORM. The central entity is the Link. Users own links and campaigns. Links can belong to an optional campaign and carry multiple tags via LinkTag. Every visitor interaction produces an asynchronous ClickEvent row. Admins manage global rules like BlockedDomain.

Auth.js manages authentication with JWT sessions. Credentials (email and bcrypt password) and Google OAuth are supported. Session and VerificationToken tables are available for Auth.js adapter compatibility.

Note: The file prisma/schema.prisma is currently a draft that Tejas must approve and commit before running migrations.

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Link : owns
    User ||--o{ Campaign : owns
    User ||--o{ BlockedDomain : creates
    User ||--o{ Account : has
    User ||--o{ Session : has
    Campaign ||--o{ Link : groups
    Link ||--o{ LinkTag : links
    Tag ||--o{ LinkTag : tags
    Link ||--o{ ClickEvent : records

    User {
        string id PK
        string email UK
        string name
        string role
    }

    Link {
        string id PK
        string code UK
        string destinationUrl
        string ownerId FK
        string campaignId FK
        string status
        int clickCount
    }

    Campaign {
        string id PK
        string name
        string ownerId FK
    }

    Tag {
        string id PK
        string name UK
    }

    LinkTag {
        string linkId PK,FK
        string tagId PK,FK
    }

    ClickEvent {
        string id PK
        string linkId FK
        datetime createdAt
        string visitorId
        boolean isBot
        string source
        string result
    }

    BlockedDomain {
        string id PK
        string domain UK
        string addedById FK
    }
```

## 3. Enums

### Role
Defines authorization privileges across the platform.
- USER: Standard user who creates and manages own links, campaigns, tags, and QR codes.
- ADMIN: Platform administrator with access to all data, disable controls, and domain blocklist.

### LinkStatus
Controls redirect engine behavior.
- ACTIVE: Link is active and can redirect if rules pass.
- DISABLED: Link is turned off manually by owner or admin. Redirect stops immediately.

Note: Expired state is not stored in LinkStatus. Expiration is derived at runtime by checking if expiresAt is in the past.

### ClickSource
Indicates how the link was opened.
- LINK: Standard web link click.
- QR: Scanned from a LinkPulse generated QR code.

### ClickResult
Records the outcome of the visitor request.
- SUCCESS: Passed all checks and redirected (302).
- DISABLED: Rejected because link status is DISABLED.
- EXPIRED: Rejected because expiresAt is in the past.
- LIMIT_REACHED: Rejected because clickCount reached maxClicks.
- PASSWORD_FAILED: Rejected because entered password was missing or invalid.

## 4. Models and Tables

### User
Represents a registered user or administrator.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String (cuid) | Yes | Primary key |
| name | String | No | Display name |
| email | String | Yes | Unique login email |
| emailVerified | DateTime | No | Timestamp of email verification |
| passwordHash | String | No | Bcrypt hash for credentials login; null for OAuth users |
| image | String | No | Profile avatar URL |
| role | Role | Yes | Defaults to USER |
| createdAt | DateTime | Yes | Account creation timestamp (UTC) |
| updatedAt | DateTime | Yes | Last update timestamp (UTC) |

### Link
The central record representing a shortened URL and its redirect rules.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String (cuid) | Yes | Primary key |
| code | String | Yes | Unique public alias or random short code |
| destinationUrl | String | Yes | Target destination URL |
| ownerId | String | Yes | Foreign key to User. Cascade on delete |
| campaignId | String | No | Foreign key to Campaign. Set null on delete |
| status | LinkStatus | Yes | Defaults to ACTIVE |
| expiresAt | DateTime | No | Optional expiry date in UTC |
| maxClicks | Int | No | Optional maximum number of successful clicks |
| clickCount | Int | Yes | Counter for atomic click cap check. Defaults to 0 |
| passwordHash | String | No | Optional bcrypt hash for password-protected links |
| mobileUrl | String | No | Optional destination override for mobile devices |
| createdAt | DateTime | Yes | Creation timestamp (UTC) |
| updatedAt | DateTime | Yes | Last update timestamp (UTC) |

### Campaign
Groups multiple links together for organized analytics.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String (cuid) | Yes | Primary key |
| name | String | Yes | Campaign name |
| description | String | No | Optional campaign notes |
| ownerId | String | Yes | Foreign key to User. Cascade on delete |
| createdAt | DateTime | Yes | Creation timestamp (UTC) |
| updatedAt | DateTime | Yes | Last update timestamp (UTC) |

### Tag
Reusable labels for categorizing links.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String (cuid) | Yes | Primary key |
| name | String | Yes | Unique tag label |
| createdAt | DateTime | Yes | Creation timestamp (UTC) |

### LinkTag
Explicit join table creating many-to-many relationship between Link and Tag.

| Field | Type | Required | Notes |
|---|---|---|---|
| linkId | String | Yes | Foreign key to Link. Cascade on delete |
| tagId | String | Yes | Foreign key to Tag. Cascade on delete |

Composite primary key: (linkId, tagId).

### ClickEvent
Captures every visit asynchronously.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String (cuid) | Yes | Primary key |
| linkId | String | Yes | Foreign key to Link. Cascade on delete |
| createdAt | DateTime | Yes | Event timestamp (UTC) |
| referrer | String | No | HTTP Referer header or direct |
| deviceType | String | No | mobile, desktop, or tablet from user agent |
| browser | String | No | Chrome, Safari, Firefox, Edge, etc. |
| os | String | No | Windows, macOS, Android, iOS, Linux |
| country | String | No | Geographic location code if available |
| isBot | Boolean | Yes | Flagged by isbot parser. Defaults to false |
| visitorId | String | Yes | Anonymized hashed visitor identifier |
| source | ClickSource | Yes | LINK or QR. Defaults to LINK |
| result | ClickResult | Yes | Outcome code. Defaults to SUCCESS |

### BlockedDomain
Global blocklist of forbidden domains maintained by administrators.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | String (cuid) | Yes | Primary key |
| domain | String | Yes | Unique hostname (for example: malicious-site.com) |
| addedById | String | No | Foreign key to User (Admin). Set null on delete |
| createdAt | DateTime | Yes | Creation timestamp (UTC) |

### Auth.js Tables (Account, Session, VerificationToken)
These models follow the standard Auth.js Prisma adapter format:
- Account: Stores OAuth accounts (such as Google OAuth) linked to a User.
- Session: Used if database session strategy is enabled. LinkPulse defaults to JWT sessions.
- VerificationToken: Used for magic links or email verification flows.

## 5. Indexes and Rationale

| Model | Index Fields | Purpose |
|---|---|---|
| Link | code (unique) | Fast O(1) lookup during visitor redirection |
| Link | (ownerId, createdAt) | Fast retrieval of user links ordered by recency |
| Link | campaignId | Quick lookup of all links within a campaign |
| ClickEvent | (linkId, createdAt) | Time-range filtering and analytics charts per link |
| ClickEvent | (linkId, isBot) | Fast filtering when bot toggle is enabled or disabled |
| ClickEvent | createdAt | Platform-wide analytics queries for admin dashboard |
| Tag | name (unique) | Prevents duplicate tags across the platform |
| BlockedDomain | domain (unique) | Immediate check during link creation wizard validation |
| User | email (unique) | Fast lookup during credentials and OAuth authentication |

## 6. Click History Protection and Cascade Rules

- Normal lifecycle: Expired and disabled links are never removed by background cleanup jobs. Expired links remain in the database with their past expiresAt timestamp. Disabled links remain with status = DISABLED. All historical ClickEvent records remain intact and visible in analytics reports.
- Explicit deletion: If a user or admin explicitly deletes a link, cascading foreign keys remove the corresponding LinkTag and ClickEvent records to maintain database referential integrity.
- Campaign deletion: When a campaign is deleted, related links have their campaignId set to NULL (onDelete: SetNull), keeping the links and clicks active.

## 7. Rules for Changing the Schema

1. Only Tejas (Team Lead) finalizes, approves, and commits changes to prisma/schema.prisma. The current schema file is a draft awaiting his approval.
2. Always commit the migration folder along with the schema change. Never edit migrations manually after creation.
3. Tejas runs `npx prisma migrate dev --name <migration-name>` to generate migrations on Supabase.
4. Teammates must run `npx prisma migrate dev` after pulling the latest `dev` branch to stay in sync.
