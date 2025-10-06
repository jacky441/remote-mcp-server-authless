# Quick Start Guide - Forms Submission Schema Smoke Test

This guide will help you quickly test the Forms Submission Schema implementation.

## Prerequisites

- Node.js 18+
- Wrangler CLI (Cloudflare Workers)
- MCP-compatible client (Claude Desktop, Cloudflare AI Playground, or mcp-remote)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Local D1 Database
```bash
# Create local D1 database (if not already created)
wrangler d1 create forms-submission-db --local

# Note: For local testing, the database is created automatically
# The database_id in wrangler.jsonc is set to "local-forms-db" for local dev
```

### 3. Start Development Server
```bash
npm run dev
```

The server will be available at `http://localhost:8787/sse`

## Testing with MCP Client

### Option 1: Cloudflare AI Playground
1. Go to https://playground.ai.cloudflare.com/
2. Enter your server URL: `http://localhost:8787/sse`
3. You'll see all available MCP tools

### Option 2: Claude Desktop
Add to your Claude Desktop config (`~/.config/Claude/claude_desktop_config.json` on Mac/Linux or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "forms-schema-test": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"
      ]
    }
  }
}
```

Restart Claude Desktop.

## Running the Smoke Test

### Step 1: Initialize the Database Schema
```
Use the init_database_schema tool
```

This creates all tables, indexes, and triggers.

### Step 2: Create a Form
```
Use create_form tool with:
- name: "Safety Inspection Form"
- description: "Daily safety inspection checklist"
```

Note the returned UUID.

### Step 3: Create a Form Version
```
Use create_form_version tool with:
- formUuid: <uuid from step 2>
- versionNumber: 1
- templateJson: {"fields": [{"id": "safety_check", "type": "checkbox", "label": "Safety equipment checked"}]}
```

Note the returned UUID.

### Step 4: Create a Submission (Draft)
```
Use create_form_submission tool with:
- formUuid: <form uuid>
- formVersionUuid: <version uuid>
- refType: "inspection"
- refId: "INS-001"
- answer: {"safety_check": true, "notes": "All good"}
- fileRefs: ["doc-uuid-1", "doc-uuid-2"] (optional)
```

Note the returned submission UUID.

### Step 5: Test Immutability
```
Use submit_form_submission tool with:
- uuid: <submission uuid>
- submittedBy: "john.doe@example.com"

Then use test_immutability tool with:
- submissionUuid: <submission uuid>
```

You should see that the answer and formVersionId cannot be modified after submission.

### Step 6: Test Referential Integrity
```
Use test_referential_integrity tool with:
- formUuid: <form uuid>
```

This verifies foreign key constraints are working.

### Step 7: Test Media Integration
```
Use test_media_integration tool with:
- formUuid: <form uuid>
- formVersionUuid: <version uuid>
```

This tests DocStore UUID storage in fileRefs.

### Step 8: Test Superseding Logic
```
Use test_superseding_logic tool with:
- formUuid: <form uuid>
- formVersionUuid: <version uuid>
```

This demonstrates how submissions can supersede previous versions.

### Step 9: Test Performance Queries
```
Use test_performance_queries tool with:
- refType: "inspection"
- refId: "INS-001"
```

This shows how indexes perform for common queries.

## Available MCP Tools

### Schema Management
- `init_database_schema` - Initialize all tables and triggers

### Forms
- `create_form` - Create a new form
- `get_form` - Get form by UUID
- `update_form` - Update form fields
- `soft_delete_form` - Soft delete a form

### Form Versions
- `create_form_version` - Create a form version
- `get_form_version` - Get version by UUID

### Form Submissions
- `create_form_submission` - Create a submission (draft)
- `submit_form_submission` - Finalize a submission
- `get_form_submission` - Get submission by UUID
- `soft_delete_form_submission` - Soft delete a submission

### Testing
- `test_referential_integrity` - Verify FK constraints
- `test_media_integration` - Test fileRefs storage
- `test_immutability` - Test submission immutability
- `test_superseding_logic` - Test versioning workflow
- `test_performance_queries` - Test index performance

## Example Workflow

Here's a complete example workflow you can test:

```
1. init_database_schema()

2. create_form(
     name: "Equipment Inspection", 
     description: "Daily equipment check"
   )
   → Returns formUuid: abc-123

3. create_form_version(
     formUuid: "abc-123",
     versionNumber: 1,
     templateJson: "{\"fields\": [{\"id\": \"status\", \"type\": \"select\", \"options\": [\"good\", \"needs_repair\"]}]}"
   )
   → Returns versionUuid: def-456

4. create_form_submission(
     formUuid: "abc-123",
     formVersionUuid: "def-456",
     refType: "equipment",
     refId: "EQUIP-001",
     answer: "{\"status\": \"good\", \"notes\": \"All systems operational\"}",
     fileRefs: "[\"photo-uuid-1\", \"photo-uuid-2\"]"
   )
   → Returns submissionUuid: ghi-789

5. submit_form_submission(
     uuid: "ghi-789",
     submittedBy: "inspector@example.com"
   )
   → Submission is now finalized and immutable

6. test_immutability(submissionUuid: "ghi-789")
   → Verifies answer cannot be changed after submission

7. Create a new version to supersede:
   create_form_submission(
     formUuid: "abc-123",
     formVersionUuid: "def-456",
     refType: "equipment",
     refId: "EQUIP-001",
     answer: "{\"status\": \"needs_repair\", \"notes\": \"Found issue\"}",
   )
   → New submission supersedes the old one
```

## Deployment

### Deploy to Cloudflare Workers

1. Create production D1 database:
```bash
wrangler d1 create forms-submission-db
```

2. Update `wrangler.jsonc` with the production database_id from the output

3. Apply migrations:
```bash
wrangler d1 execute forms-submission-db --file=migrations/0001_create_forms_schema.sql
```

4. Deploy:
```bash
npm run deploy
```

Your MCP server will be available at: `https://remote-mcp-server-authless.<your-account>.workers.dev/sse`

## Troubleshooting

### Database not found
If you get a database error, make sure you've initialized the schema:
```
Use init_database_schema tool first
```

### Type errors
If you see TypeScript errors, run:
```bash
npm run type-check
```

### Format code
```bash
npm run format
```

## Documentation

See [FORMS_SCHEMA_SMOKE_TEST.md](./FORMS_SCHEMA_SMOKE_TEST.md) for:
- Complete schema documentation
- Detailed smoke test results
- Risk analysis and recommendations
- Known limitations and future improvements

## Support

For issues or questions:
1. Check the [FORMS_SCHEMA_SMOKE_TEST.md](./FORMS_SCHEMA_SMOKE_TEST.md) documentation
2. Review the migration file: `migrations/0001_create_forms_schema.sql`
3. Examine the MCP tool implementations in `src/index.ts`
