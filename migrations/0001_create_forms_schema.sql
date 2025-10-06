-- Forms Submission Schema (MVP)
-- Smoke test implementation for PWA + Laravel system

-- Table: forms
-- Manages templates, version pointers, and lifecycle metadata
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

CREATE INDEX idx_forms_uuid ON forms(uuid);
CREATE INDEX idx_forms_isActive ON forms(isActive);
CREATE INDEX idx_forms_deletedAt ON forms(deletedAt);

-- Table: form_versions
-- Versioned templates, JSON schema, and optional HTML
CREATE TABLE IF NOT EXISTS form_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    formId INTEGER NOT NULL,
    versionNumber INTEGER NOT NULL,
    templateJson TEXT NOT NULL, -- JSONB equivalent for schema definition
    htmlTemplate TEXT,
    schemaVersion TEXT NOT NULL DEFAULT '1.0.0',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy TEXT,
    FOREIGN KEY (formId) REFERENCES forms(id),
    UNIQUE(formId, versionNumber)
);

CREATE INDEX idx_form_versions_uuid ON form_versions(uuid);
CREATE INDEX idx_form_versions_formId ON form_versions(formId);
CREATE INDEX idx_form_versions_versionNumber ON form_versions(formId, versionNumber);

-- Table: form_submissions
-- Immutable submission snapshots per contract/job, references to form_versions
CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    formId INTEGER NOT NULL,
    formVersionId INTEGER NOT NULL,
    refType TEXT NOT NULL, -- e.g., 'contract', 'job', 'inspection'
    refId TEXT NOT NULL, -- UUID or ID of the referenced entity
    answer TEXT NOT NULL, -- JSONB equivalent for field data
    fileRefs TEXT, -- JSONB array of DocStore UUIDs
    status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
    submittedAt TEXT,
    submittedBy TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    supersededBy INTEGER, -- References another submission UUID if this is superseded
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    deletedAt TEXT,
    FOREIGN KEY (formId) REFERENCES forms(id),
    FOREIGN KEY (formVersionId) REFERENCES form_versions(id),
    UNIQUE(refType, refId, formId, isActive) -- Only one active submission per entity+form
);

CREATE INDEX idx_form_submissions_uuid ON form_submissions(uuid);
CREATE INDEX idx_form_submissions_formId ON form_submissions(formId);
CREATE INDEX idx_form_submissions_formVersionId ON form_submissions(formVersionId);
CREATE INDEX idx_form_submissions_refType_refId ON form_submissions(refType, refId);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_isActive ON form_submissions(isActive);
CREATE INDEX idx_form_submissions_deletedAt ON form_submissions(deletedAt);

-- Table: form_stages (OPTIONAL - for MVP)
-- For staged completion logic
CREATE TABLE IF NOT EXISTS form_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    submissionId INTEGER NOT NULL,
    stageName TEXT NOT NULL,
    stageOrder INTEGER NOT NULL,
    stageData TEXT, -- JSONB equivalent for stage-specific data
    completedAt TEXT,
    completedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (submissionId) REFERENCES form_submissions(id),
    UNIQUE(submissionId, stageName)
);

CREATE INDEX idx_form_stages_uuid ON form_stages(uuid);
CREATE INDEX idx_form_stages_submissionId ON form_stages(submissionId);
CREATE INDEX idx_form_stages_stageOrder ON form_stages(submissionId, stageOrder);

-- Table: form_submissions_field_audit_logs (OPTIONAL - for MVP)
-- For field-level audit trails
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

CREATE INDEX idx_audit_logs_uuid ON form_submissions_field_audit_logs(uuid);
CREATE INDEX idx_audit_logs_submissionId ON form_submissions_field_audit_logs(submissionId);
CREATE INDEX idx_audit_logs_fieldName ON form_submissions_field_audit_logs(fieldName);
CREATE INDEX idx_audit_logs_changedAt ON form_submissions_field_audit_logs(changedAt);

-- Trigger to update updatedAt timestamp on forms
CREATE TRIGGER IF NOT EXISTS update_forms_timestamp
AFTER UPDATE ON forms
FOR EACH ROW
BEGIN
    UPDATE forms SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update updatedAt timestamp on form_submissions
CREATE TRIGGER IF NOT EXISTS update_submissions_timestamp
AFTER UPDATE ON form_submissions
FOR EACH ROW
BEGIN
    UPDATE form_submissions SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to enforce immutability after submission
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
