import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Types for Forms Submission Schema
interface Form {
	id?: number;
	uuid: string;
	name: string;
	description?: string;
	currentVersionId?: number;
	isActive: number;
}

interface FormVersion {
	id?: number;
	uuid: string;
	formId: number;
	versionNumber: number;
	templateJson: string;
	htmlTemplate?: string;
	schemaVersion: string;
	createdBy?: string;
}

interface FormSubmission {
	id?: number;
	uuid: string;
	formId: number;
	formVersionId: number;
	refType: string;
	refId: string;
	answer: string;
	fileRefs?: string;
	status: string;
	submittedAt?: string;
	submittedBy?: string;
	isActive: number;
	supersededBy?: number;
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent<Env> {
	server = new McpServer({
		name: "Forms Submission Schema Smoke Test",
		version: "1.0.0",
	});

	async init() {
		// Helper function to generate UUID
		const generateUUID = () => {
			return crypto.randomUUID();
		};

		// Get database reference
		const db = () => this.env.DB;

		// 1. CRUD Operations for Forms
		this.server.tool(
			"create_form",
			{
				name: z.string(),
				description: z.string().optional(),
			},
			async ({ name, description }) => {
				const uuid = generateUUID();
				const result = await db()
					.prepare(
						"INSERT INTO forms (uuid, name, description, isActive) VALUES (?, ?, ?, 1)",
					)
					.bind(uuid, name, description || null)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								uuid,
								message: "Form created successfully",
							}),
						},
					],
				};
			},
		);

		this.server.tool("get_form", { uuid: z.string() }, async ({ uuid }) => {
			const result = await db()
				.prepare("SELECT * FROM forms WHERE uuid = ?")
				.bind(uuid)
				.first<Form>();

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(result || { error: "Form not found" }),
					},
				],
			};
		});

		this.server.tool(
			"update_form",
			{
				uuid: z.string(),
				name: z.string().optional(),
				description: z.string().optional(),
			},
			async ({ uuid, name, description }) => {
				const updates: string[] = [];
				const bindings: any[] = [];

				if (name) {
					updates.push("name = ?");
					bindings.push(name);
				}
				if (description !== undefined) {
					updates.push("description = ?");
					bindings.push(description);
				}

				if (updates.length === 0) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "No updates provided" }),
							},
						],
					};
				}

				bindings.push(uuid);
				const result = await db()
					.prepare(`UPDATE forms SET ${updates.join(", ")} WHERE uuid = ?`)
					.bind(...bindings)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								message: "Form updated successfully",
							}),
						},
					],
				};
			},
		);

		this.server.tool(
			"soft_delete_form",
			{ uuid: z.string() },
			async ({ uuid }) => {
				const result = await db()
					.prepare(
						"UPDATE forms SET deletedAt = datetime('now'), isActive = 0 WHERE uuid = ?",
					)
					.bind(uuid)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								message: "Form soft-deleted successfully",
							}),
						},
					],
				};
			},
		);

		// 2. CRUD Operations for Form Versions
		this.server.tool(
			"create_form_version",
			{
				formUuid: z.string(),
				versionNumber: z.number(),
				templateJson: z.string(),
				htmlTemplate: z.string().optional(),
				createdBy: z.string().optional(),
			},
			async ({
				formUuid,
				versionNumber,
				templateJson,
				htmlTemplate,
				createdBy,
			}) => {
				const uuid = generateUUID();

				// Get formId from formUuid
				const form = await db()
					.prepare("SELECT id FROM forms WHERE uuid = ?")
					.bind(formUuid)
					.first<{ id: number }>();

				if (!form) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Form not found" }),
							},
						],
					};
				}

				const result = await db()
					.prepare(
						"INSERT INTO form_versions (uuid, formId, versionNumber, templateJson, htmlTemplate, schemaVersion, createdBy) VALUES (?, ?, ?, ?, ?, '1.0.0', ?)",
					)
					.bind(
						uuid,
						form.id,
						versionNumber,
						templateJson,
						htmlTemplate || null,
						createdBy || null,
					)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								uuid,
								message: "Form version created successfully",
							}),
						},
					],
				};
			},
		);

		this.server.tool(
			"get_form_version",
			{ uuid: z.string() },
			async ({ uuid }) => {
				const result = await db()
					.prepare("SELECT * FROM form_versions WHERE uuid = ?")
					.bind(uuid)
					.first<FormVersion>();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								result || { error: "Form version not found" },
							),
						},
					],
				};
			},
		);

		// 3. CRUD Operations for Form Submissions
		this.server.tool(
			"create_form_submission",
			{
				formUuid: z.string(),
				formVersionUuid: z.string(),
				refType: z.string(),
				refId: z.string(),
				answer: z.string(),
				fileRefs: z.string().optional(),
			},
			async ({
				formUuid,
				formVersionUuid,
				refType,
				refId,
				answer,
				fileRefs,
			}) => {
				const uuid = generateUUID();

				// Get formId and formVersionId
				const form = await db()
					.prepare("SELECT id FROM forms WHERE uuid = ?")
					.bind(formUuid)
					.first<{ id: number }>();

				const version = await db()
					.prepare("SELECT id FROM form_versions WHERE uuid = ?")
					.bind(formVersionUuid)
					.first<{ id: number }>();

				if (!form || !version) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Form or version not found" }),
							},
						],
					};
				}

				const result = await db()
					.prepare(
						"INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1)",
					)
					.bind(
						uuid,
						form.id,
						version.id,
						refType,
						refId,
						answer,
						fileRefs || null,
					)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								uuid,
								message: "Form submission created successfully",
							}),
						},
					],
				};
			},
		);

		this.server.tool(
			"submit_form_submission",
			{
				uuid: z.string(),
				submittedBy: z.string(),
			},
			async ({ uuid, submittedBy }) => {
				const result = await db()
					.prepare(
						"UPDATE form_submissions SET status = 'submitted', submittedAt = datetime('now'), submittedBy = ? WHERE uuid = ? AND submittedAt IS NULL",
					)
					.bind(submittedBy, uuid)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								message: result.success
									? "Form submission finalized"
									: "Submission already finalized or not found",
							}),
						},
					],
				};
			},
		);

		this.server.tool(
			"get_form_submission",
			{ uuid: z.string() },
			async ({ uuid }) => {
				const result = await db()
					.prepare("SELECT * FROM form_submissions WHERE uuid = ?")
					.bind(uuid)
					.first<FormSubmission>();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								result || { error: "Form submission not found" },
							),
						},
					],
				};
			},
		);

		this.server.tool(
			"soft_delete_form_submission",
			{ uuid: z.string() },
			async ({ uuid }) => {
				const result = await db()
					.prepare(
						"UPDATE form_submissions SET deletedAt = datetime('now'), isActive = 0 WHERE uuid = ?",
					)
					.bind(uuid)
					.run();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: result.success,
								message: "Form submission soft-deleted successfully",
							}),
						},
					],
				};
			},
		);

		// 4. Test Referential Integrity
		this.server.tool(
			"test_referential_integrity",
			{ formUuid: z.string() },
			async ({ formUuid }) => {
				const tests: any[] = [];

				// Test 1: Try to create a version for a non-existent form
				try {
					await db()
						.prepare(
							"INSERT INTO form_versions (uuid, formId, versionNumber, templateJson, schemaVersion) VALUES (?, 999999, 1, '{}', '1.0.0')",
						)
						.bind(generateUUID())
						.run();
					tests.push({ test: "FK constraint on formId", passed: false });
				} catch (e) {
					tests.push({ test: "FK constraint on formId", passed: true });
				}

				// Test 2: Check UNIQUE constraint on (refType, refId, formId, isActive)
				const form = await db()
					.prepare("SELECT id FROM forms WHERE uuid = ?")
					.bind(formUuid)
					.first<{ id: number }>();

				if (form) {
					try {
						const uuid1 = generateUUID();
						const uuid2 = generateUUID();
						await db()
							.prepare(
								"INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, status, isActive) VALUES (?, ?, 1, 'test', 'test123', '{}', 'draft', 1)",
							)
							.bind(uuid1, form.id)
							.run();

						await db()
							.prepare(
								"INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, status, isActive) VALUES (?, ?, 1, 'test', 'test123', '{}', 'draft', 1)",
							)
							.bind(uuid2, form.id)
							.run();

						tests.push({
							test: "UNIQUE constraint on (refType, refId, formId, isActive)",
							passed: false,
						});
					} catch (e) {
						tests.push({
							test: "UNIQUE constraint on (refType, refId, formId, isActive)",
							passed: true,
						});
					}
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								tests,
								message: "Referential integrity tests completed",
							}),
						},
					],
				};
			},
		);

		// 5. Test Media Integration
		this.server.tool(
			"test_media_integration",
			{
				formUuid: z.string(),
				formVersionUuid: z.string(),
			},
			async ({ formUuid, formVersionUuid }) => {
				const docStoreUuids = [generateUUID(), generateUUID(), generateUUID()];
				const fileRefsJson = JSON.stringify(docStoreUuids);

				const form = await db()
					.prepare("SELECT id FROM forms WHERE uuid = ?")
					.bind(formUuid)
					.first<{ id: number }>();

				const version = await db()
					.prepare("SELECT id FROM form_versions WHERE uuid = ?")
					.bind(formVersionUuid)
					.first<{ id: number }>();

				if (!form || !version) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Form or version not found" }),
							},
						],
					};
				}

				const uuid = generateUUID();
				await db()
					.prepare(
						"INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, isActive) VALUES (?, ?, ?, 'contract', 'C001', '{}', ?, 'draft', 1)",
					)
					.bind(uuid, form.id, version.id, fileRefsJson)
					.run();

				const submission = await db()
					.prepare("SELECT fileRefs FROM form_submissions WHERE uuid = ?")
					.bind(uuid)
					.first<{ fileRefs: string }>();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: true,
								docStoreUuids,
								retrieved: submission?.fileRefs
									? JSON.parse(submission.fileRefs)
									: null,
								message: "Media integration test completed",
							}),
						},
					],
				};
			},
		);

		// 6. Test Immutability
		this.server.tool(
			"test_immutability",
			{ submissionUuid: z.string() },
			async ({ submissionUuid }) => {
				const tests: any[] = [];

				// Submit the form first
				await db()
					.prepare(
						"UPDATE form_submissions SET status = 'submitted', submittedAt = datetime('now') WHERE uuid = ?",
					)
					.bind(submissionUuid)
					.run();

				// Test 1: Try to modify answer after submission
				try {
					await db()
						.prepare("UPDATE form_submissions SET answer = '{}' WHERE uuid = ?")
						.bind(submissionUuid)
						.run();
					tests.push({
						test: "Prevent answer modification after submission",
						passed: false,
					});
				} catch (e) {
					tests.push({
						test: "Prevent answer modification after submission",
						passed: true,
					});
				}

				// Test 2: Try to modify formVersionId after submission
				try {
					await db()
						.prepare(
							"UPDATE form_submissions SET formVersionId = 999 WHERE uuid = ?",
						)
						.bind(submissionUuid)
						.run();
					tests.push({
						test: "Prevent formVersionId modification after submission",
						passed: false,
					});
				} catch (e) {
					tests.push({
						test: "Prevent formVersionId modification after submission",
						passed: true,
					});
				}

				// Test 3: Verify that status can still be updated
				try {
					await db()
						.prepare(
							"UPDATE form_submissions SET status = 'approved' WHERE uuid = ?",
						)
						.bind(submissionUuid)
						.run();
					tests.push({
						test: "Allow status modification after submission",
						passed: true,
					});
				} catch (e) {
					tests.push({
						test: "Allow status modification after submission",
						passed: false,
					});
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								tests,
								message: "Immutability tests completed",
							}),
						},
					],
				};
			},
		);

		// 7. Test Versioning & Superseding Logic
		this.server.tool(
			"test_superseding_logic",
			{
				formUuid: z.string(),
				formVersionUuid: z.string(),
			},
			async ({ formUuid, formVersionUuid }) => {
				const form = await db()
					.prepare("SELECT id FROM forms WHERE uuid = ?")
					.bind(formUuid)
					.first<{ id: number }>();

				const version = await db()
					.prepare("SELECT id FROM form_versions WHERE uuid = ?")
					.bind(formVersionUuid)
					.first<{ id: number }>();

				if (!form || !version) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Form or version not found" }),
							},
						],
					};
				}

				// Create first submission
				const uuid1 = generateUUID();
				await db()
					.prepare(
						"INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, status, isActive) VALUES (?, ?, ?, 'job', 'J001', '{\"field1\": \"value1\"}', 'draft', 1)",
					)
					.bind(uuid1, form.id, version.id)
					.run();

				// Create second submission (superseding the first)
				const uuid2 = generateUUID();

				// First, deactivate the old submission
				await db()
					.prepare(
						"UPDATE form_submissions SET isActive = 0, supersededBy = ? WHERE uuid = ?",
					)
					.bind(uuid2, uuid1)
					.run();

				// Then create the new submission
				await db()
					.prepare(
						"INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, status, isActive) VALUES (?, ?, ?, 'job', 'J001', '{\"field1\": \"value2\"}', 'draft', 1)",
					)
					.bind(uuid2, form.id, version.id)
					.run();

				// Query to verify only active submission
				const activeSubmissions = await db()
					.prepare(
						"SELECT uuid, answer, isActive FROM form_submissions WHERE refType = 'job' AND refId = 'J001' AND isActive = 1",
					)
					.all();

				const supersededSubmission = await db()
					.prepare(
						"SELECT uuid, supersededBy FROM form_submissions WHERE uuid = ?",
					)
					.bind(uuid1)
					.first();

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: true,
								originalSubmission: uuid1,
								newSubmission: uuid2,
								activeSubmissions: activeSubmissions.results,
								supersededSubmission,
								message: "Superseding logic test completed",
							}),
						},
					],
				};
			},
		);

		// 8. Test Performance Queries
		this.server.tool(
			"test_performance_queries",
			{ refType: z.string(), refId: z.string() },
			async ({ refType, refId }) => {
				const queries: any[] = [];

				// Query 1: Get all active submissions for a reference
				const start1 = Date.now();
				const result1 = await db()
					.prepare(
						"SELECT * FROM form_submissions WHERE refType = ? AND refId = ? AND isActive = 1",
					)
					.bind(refType, refId)
					.all();
				queries.push({
					query: "Get active submissions by refType/refId",
					time_ms: Date.now() - start1,
					count: result1.results.length,
				});

				// Query 2: Get form with its current version
				const start2 = Date.now();
				const result2 = await db()
					.prepare(
						"SELECT f.*, fv.* FROM forms f LEFT JOIN form_versions fv ON f.currentVersionId = fv.id WHERE f.isActive = 1",
					)
					.all();
				queries.push({
					query: "Get forms with current versions",
					time_ms: Date.now() - start2,
					count: result2.results.length,
				});

				// Query 3: Get all versions of a form
				const start3 = Date.now();
				const result3 = await db()
					.prepare(
						"SELECT * FROM form_versions WHERE formId IN (SELECT id FROM forms WHERE isActive = 1) ORDER BY versionNumber DESC",
					)
					.all();
				queries.push({
					query: "Get all versions ordered by versionNumber",
					time_ms: Date.now() - start3,
					count: result3.results.length,
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								queries,
								message: "Performance queries completed",
							}),
						},
					],
				};
			},
		);

		// 9. Initialize Database Schema
		this.server.tool("init_database_schema", {}, async (_) => {
			try {
				// Read the migration file content inline
				const migrationSQL = `
-- Forms Submission Schema (MVP)
CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    currentVersionId INTEGER,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    deletedAt TEXT,
    FOREIGN KEY (currentVersionId) REFERENCES form_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_forms_uuid ON forms(uuid);
CREATE INDEX IF NOT EXISTS idx_forms_isActive ON forms(isActive);
CREATE INDEX IF NOT EXISTS idx_forms_deletedAt ON forms(deletedAt);

CREATE TABLE IF NOT EXISTS form_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    formId INTEGER NOT NULL,
    versionNumber INTEGER NOT NULL,
    templateJson TEXT NOT NULL,
    htmlTemplate TEXT,
    schemaVersion TEXT NOT NULL DEFAULT '1.0.0',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy TEXT,
    FOREIGN KEY (formId) REFERENCES forms(id),
    UNIQUE(formId, versionNumber)
);

CREATE INDEX IF NOT EXISTS idx_form_versions_uuid ON form_versions(uuid);
CREATE INDEX IF NOT EXISTS idx_form_versions_formId ON form_versions(formId);
CREATE INDEX IF NOT EXISTS idx_form_versions_versionNumber ON form_versions(formId, versionNumber);

CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    formId INTEGER NOT NULL,
    formVersionId INTEGER NOT NULL,
    refType TEXT NOT NULL,
    refId TEXT NOT NULL,
    answer TEXT NOT NULL,
    fileRefs TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    submittedAt TEXT,
    submittedBy TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    supersededBy INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    deletedAt TEXT,
    FOREIGN KEY (formId) REFERENCES forms(id),
    FOREIGN KEY (formVersionId) REFERENCES form_versions(id),
    UNIQUE(refType, refId, formId, isActive)
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_uuid ON form_submissions(uuid);
CREATE INDEX IF NOT EXISTS idx_form_submissions_formId ON form_submissions(formId);
CREATE INDEX IF NOT EXISTS idx_form_submissions_formVersionId ON form_submissions(formVersionId);
CREATE INDEX IF NOT EXISTS idx_form_submissions_refType_refId ON form_submissions(refType, refId);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_isActive ON form_submissions(isActive);
CREATE INDEX IF NOT EXISTS idx_form_submissions_deletedAt ON form_submissions(deletedAt);

CREATE TABLE IF NOT EXISTS form_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    submissionId INTEGER NOT NULL,
    stageName TEXT NOT NULL,
    stageOrder INTEGER NOT NULL,
    stageData TEXT,
    completedAt TEXT,
    completedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (submissionId) REFERENCES form_submissions(id),
    UNIQUE(submissionId, stageName)
);

CREATE INDEX IF NOT EXISTS idx_form_stages_uuid ON form_stages(uuid);
CREATE INDEX IF NOT EXISTS idx_form_stages_submissionId ON form_stages(submissionId);
CREATE INDEX IF NOT EXISTS idx_form_stages_stageOrder ON form_stages(submissionId, stageOrder);

CREATE TABLE IF NOT EXISTS form_submissions_field_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    submissionId INTEGER NOT NULL,
    fieldName TEXT NOT NULL,
    oldValue TEXT,
    newValue TEXT,
    changedAt TEXT NOT NULL DEFAULT (datetime('now')),
    changedBy TEXT,
    changeReason TEXT,
    FOREIGN KEY (submissionId) REFERENCES form_submissions(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_uuid ON form_submissions_field_audit_logs(uuid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_submissionId ON form_submissions_field_audit_logs(submissionId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fieldName ON form_submissions_field_audit_logs(fieldName);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changedAt ON form_submissions_field_audit_logs(changedAt);

CREATE TRIGGER IF NOT EXISTS update_forms_timestamp
AFTER UPDATE ON forms
FOR EACH ROW
BEGIN
    UPDATE forms SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_submissions_timestamp
AFTER UPDATE ON form_submissions
FOR EACH ROW
BEGIN
    UPDATE form_submissions SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS prevent_submission_modification
BEFORE UPDATE ON form_submissions
FOR EACH ROW
WHEN OLD.submittedAt IS NOT NULL AND (
    OLD.answer != NEW.answer OR 
    OLD.formVersionId != NEW.formVersionId
)
BEGIN
    SELECT RAISE(ABORT, 'Cannot modify answer or formVersionId after submission');
END;
`;

				const result = await db().exec(migrationSQL);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: true,
								message: "Database schema initialized successfully",
								result,
							}),
						},
					],
				};
			} catch (error: any) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: false,
								error: error.message,
								message: "Failed to initialize database schema",
							}),
						},
					],
				};
			}
		});

		// Keep original calculator tools for backward compatibility
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			}),
		);

		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
