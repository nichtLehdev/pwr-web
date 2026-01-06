# API Documentation

## tRPC Routers

All API calls go through tRPC for end-to-end type safety.

### Available Routers

- `events` - Event management (CRUD, approval, filtering)
- `courses` - Course management (CRUD, registration, approval)
- `posts` - News/post management (CRUD, approval)
- `registrations` - Course registration management
- `ensembles` - Ensemble management
- `auswahlchoere` - Select choir management
- `bezirke` - District management
- `media` - Media/file management
- `materials` - Downloads management
- `users` - User management
- `organization` - Team, Vorstand, Posaunenrat, etc.
- `locations` - Location management
- `newsletter` - Newsletter subscriptions
- `search` - Global search

### Common Procedures

**Public:**
- `getAll` - List items (with pagination, filtering)
- `getById` - Get single item

**Protected (authenticated):**
- `create` - Create new item
- `update` - Update existing item
- `delete` - Delete item

**Reviewer (LPW/RPW):**
- `approve` - Approve pending content
- `reject` - Reject with notes

**Admin:**
- `bulkUpdate` - Update multiple items
- `bulkDelete` - Delete multiple items

## REST API Routes

### `/api/upload`
- **POST** - Upload file (returns `Media` object)
- Requires authentication
- Accepts: images, PDFs, documents

### `/api/uploads/:path*`
- **GET** - Serve uploaded files
- Public access for approved media

### `/api/auth/[...all]`
- Better Auth endpoints (login, logout, OAuth, etc.)

### `/api/test-email`
- **GET** - Check email configuration
- **POST** - Send test email

## Content Status Flow

```
DRAFT → PENDING → APPROVED
         ↓
      REJECTED
```

- `DRAFT` - Work in progress
- `PENDING` - Submitted, awaiting approval
- `APPROVED` - Published and visible
- `REJECTED` - Needs revision
- `ARCHIVED` - No longer active

