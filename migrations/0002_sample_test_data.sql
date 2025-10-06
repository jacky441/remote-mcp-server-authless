-- Sample Test Data for Forms Submission Schema
-- Use this file to populate the database with test data for smoke testing

-- Insert sample forms
INSERT INTO forms (uuid, name, description, isActive) VALUES 
('form-001', 'Safety Inspection Form', 'Daily safety inspection checklist for equipment and facilities', 1),
('form-002', 'Equipment Maintenance Log', 'Record of equipment maintenance activities', 1),
('form-003', 'Incident Report', 'Report workplace incidents and near-misses', 1);

-- Insert form versions for Safety Inspection Form
INSERT INTO form_versions (uuid, formId, versionNumber, templateJson, schemaVersion) VALUES
('version-001', 1, 1, '{
  "title": "Safety Inspection",
  "fields": [
    {"id": "date", "type": "date", "label": "Inspection Date", "required": true},
    {"id": "inspector", "type": "text", "label": "Inspector Name", "required": true},
    {"id": "location", "type": "text", "label": "Location", "required": true},
    {"id": "fire_equipment", "type": "checkbox", "label": "Fire extinguishers checked"},
    {"id": "emergency_exits", "type": "checkbox", "label": "Emergency exits clear"},
    {"id": "safety_signs", "type": "checkbox", "label": "Safety signs visible"},
    {"id": "ppe_available", "type": "checkbox", "label": "PPE available and in good condition"},
    {"id": "hazards", "type": "textarea", "label": "Hazards identified"},
    {"id": "actions", "type": "textarea", "label": "Corrective actions required"}
  ]
}', '1.0.0'),
('version-002', 1, 2, '{
  "title": "Safety Inspection v2",
  "fields": [
    {"id": "date", "type": "date", "label": "Inspection Date", "required": true},
    {"id": "inspector", "type": "text", "label": "Inspector Name", "required": true},
    {"id": "location", "type": "text", "label": "Location", "required": true},
    {"id": "fire_equipment", "type": "checkbox", "label": "Fire extinguishers checked"},
    {"id": "emergency_exits", "type": "checkbox", "label": "Emergency exits clear"},
    {"id": "safety_signs", "type": "checkbox", "label": "Safety signs visible"},
    {"id": "ppe_available", "type": "checkbox", "label": "PPE available and in good condition"},
    {"id": "first_aid", "type": "checkbox", "label": "First aid kit stocked"},
    {"id": "spill_kits", "type": "checkbox", "label": "Spill kits available"},
    {"id": "hazards", "type": "textarea", "label": "Hazards identified"},
    {"id": "actions", "type": "textarea", "label": "Corrective actions required"},
    {"id": "followup_date", "type": "date", "label": "Follow-up inspection date"}
  ]
}', '1.0.0');

-- Insert form versions for Equipment Maintenance Log
INSERT INTO form_versions (uuid, formId, versionNumber, templateJson, schemaVersion) VALUES
('version-003', 2, 1, '{
  "title": "Equipment Maintenance",
  "fields": [
    {"id": "equipment_id", "type": "text", "label": "Equipment ID", "required": true},
    {"id": "maintenance_type", "type": "select", "label": "Maintenance Type", "options": ["Preventive", "Corrective", "Emergency"], "required": true},
    {"id": "technician", "type": "text", "label": "Technician Name", "required": true},
    {"id": "date", "type": "date", "label": "Date", "required": true},
    {"id": "hours", "type": "number", "label": "Hours Spent"},
    {"id": "parts_replaced", "type": "textarea", "label": "Parts Replaced"},
    {"id": "work_performed", "type": "textarea", "label": "Work Performed"},
    {"id": "next_service", "type": "date", "label": "Next Service Date"}
  ]
}', '1.0.0');

-- Insert form versions for Incident Report
INSERT INTO form_versions (uuid, formId, versionNumber, templateJson, schemaVersion) VALUES
('version-004', 3, 1, '{
  "title": "Incident Report",
  "fields": [
    {"id": "incident_date", "type": "datetime", "label": "Incident Date & Time", "required": true},
    {"id": "reporter", "type": "text", "label": "Reported By", "required": true},
    {"id": "location", "type": "text", "label": "Location", "required": true},
    {"id": "incident_type", "type": "select", "label": "Incident Type", "options": ["Injury", "Near-miss", "Property Damage", "Environmental", "Security"], "required": true},
    {"id": "severity", "type": "select", "label": "Severity", "options": ["Minor", "Moderate", "Severe", "Critical"], "required": true},
    {"id": "description", "type": "textarea", "label": "Incident Description", "required": true},
    {"id": "witnesses", "type": "textarea", "label": "Witnesses"},
    {"id": "immediate_actions", "type": "textarea", "label": "Immediate Actions Taken"},
    {"id": "root_cause", "type": "textarea", "label": "Root Cause Analysis"},
    {"id": "corrective_actions", "type": "textarea", "label": "Corrective Actions"}
  ]
}', '1.0.0');

-- Update forms to point to current versions
UPDATE forms SET currentVersionId = 2 WHERE id = 1; -- Safety Inspection uses v2
UPDATE forms SET currentVersionId = 3 WHERE id = 2; -- Equipment Maintenance uses v1
UPDATE forms SET currentVersionId = 4 WHERE id = 3; -- Incident Report uses v1

-- Insert sample submissions (draft and submitted)

-- Draft safety inspection
INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, isActive) VALUES
('sub-001', 1, 2, 'facility', 'FACILITY-001', '{
  "date": "2024-01-15",
  "inspector": "John Smith",
  "location": "Warehouse A",
  "fire_equipment": true,
  "emergency_exits": true,
  "safety_signs": true,
  "ppe_available": true,
  "first_aid": true,
  "spill_kits": true,
  "hazards": "None identified",
  "actions": "None required",
  "followup_date": "2024-02-15"
}', '["photo-warehouse-a-1.jpg", "photo-warehouse-a-2.jpg"]', 'draft', 1);

-- Submitted safety inspection
INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, submittedAt, submittedBy, isActive) VALUES
('sub-002', 1, 2, 'facility', 'FACILITY-002', '{
  "date": "2024-01-14",
  "inspector": "Jane Doe",
  "location": "Office Building",
  "fire_equipment": true,
  "emergency_exits": true,
  "safety_signs": false,
  "ppe_available": true,
  "first_aid": true,
  "spill_kits": true,
  "hazards": "Exit sign needs replacement on 2nd floor",
  "actions": "Replace exit sign by 2024-01-20",
  "followup_date": "2024-02-14"
}', '["photo-office-1.jpg"]', 'submitted', datetime('now'), 'jane.doe@example.com', 1);

-- Equipment maintenance log (submitted)
INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, submittedAt, submittedBy, isActive) VALUES
('sub-003', 2, 3, 'equipment', 'EQUIP-001', '{
  "equipment_id": "FORKLIFT-FL-001",
  "maintenance_type": "Preventive",
  "technician": "Mike Johnson",
  "date": "2024-01-15",
  "hours": 2.5,
  "parts_replaced": "Oil filter, hydraulic fluid",
  "work_performed": "Changed oil and filter, inspected hydraulic system, checked brakes, tested all functions",
  "next_service": "2024-04-15"
}', '["maintenance-log-FL-001.pdf"]', 'submitted', datetime('now'), 'mike.johnson@example.com', 1);

-- Incident report (submitted)
INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, submittedAt, submittedBy, isActive) VALUES
('sub-004', 3, 4, 'incident', 'INC-2024-001', '{
  "incident_date": "2024-01-13T14:30:00",
  "reporter": "Sarah Williams",
  "location": "Loading Dock",
  "incident_type": "Near-miss",
  "severity": "Moderate",
  "description": "Pallet almost fell from forklift due to improper stacking",
  "witnesses": "Tom Brown (dock supervisor), Lisa Chen (warehouse worker)",
  "immediate_actions": "Stopped work, secured pallet, retrained operator on proper stacking procedures",
  "root_cause": "Operator rushed due to time pressure, inadequate training on maximum stack height",
  "corrective_actions": "1. Reinforce stacking height limits with all operators, 2. Review workload expectations, 3. Add visual height markers to forklifts"
}', '["incident-photo-1.jpg", "incident-photo-2.jpg", "witness-statement-tom.pdf"]', 'submitted', datetime('now'), 'sarah.williams@example.com', 1);

-- Demonstration of superseding: Equipment maintenance with updated info
-- First, mark the original as superseded
UPDATE form_submissions SET isActive = 0, supersededBy = 'sub-005' WHERE uuid = 'sub-003';

-- Then insert the new version
INSERT INTO form_submissions (uuid, formId, formVersionId, refType, refId, answer, fileRefs, status, submittedAt, submittedBy, isActive) VALUES
('sub-005', 2, 3, 'equipment', 'EQUIP-001', '{
  "equipment_id": "FORKLIFT-FL-001",
  "maintenance_type": "Preventive",
  "technician": "Mike Johnson",
  "date": "2024-01-15",
  "hours": 3.0,
  "parts_replaced": "Oil filter, hydraulic fluid, brake pads",
  "work_performed": "Changed oil and filter, inspected hydraulic system, replaced worn brake pads, tested all functions, calibrated load sensor",
  "next_service": "2024-04-15"
}', '["maintenance-log-FL-001-v2.pdf", "brake-inspection-report.pdf"]', 'submitted', datetime('now'), 'mike.johnson@example.com', 1);

-- Insert sample form stages for multi-step submission
INSERT INTO form_stages (uuid, submissionId, stageName, stageOrder, completedAt, completedBy) VALUES
('stage-001', 4, 'Initial Report', 1, datetime('now'), 'sarah.williams@example.com'),
('stage-002', 4, 'Supervisor Review', 2, datetime('now'), 'tom.brown@example.com'),
('stage-003', 4, 'Safety Manager Review', 3, NULL, NULL); -- Not yet completed

-- Insert sample audit log entries
INSERT INTO form_submissions_field_audit_logs (uuid, submissionId, fieldName, oldValue, newValue, changedAt, changedBy, changeReason) VALUES
('audit-001', 5, 'hours', '2.5', '3.0', datetime('now'), 'mike.johnson@example.com', 'Discovered additional time required for brake pad replacement'),
('audit-002', 5, 'parts_replaced', 'Oil filter, hydraulic fluid', 'Oil filter, hydraulic fluid, brake pads', datetime('now'), 'mike.johnson@example.com', 'Added brake pads to parts list'),
('audit-003', 5, 'work_performed', 'Changed oil and filter, inspected hydraulic system, checked brakes, tested all functions', 'Changed oil and filter, inspected hydraulic system, replaced worn brake pads, tested all functions, calibrated load sensor', datetime('now'), 'mike.johnson@example.com', 'Updated with additional work performed');

-- Query to verify data
-- Run these queries to check the test data:

-- SELECT * FROM forms;
-- SELECT * FROM form_versions ORDER BY formId, versionNumber;
-- SELECT uuid, name, currentVersionId FROM forms f LEFT JOIN form_versions fv ON f.currentVersionId = fv.id;
-- SELECT * FROM form_submissions ORDER BY createdAt DESC;
-- SELECT * FROM form_stages;
-- SELECT * FROM form_submissions_field_audit_logs ORDER BY changedAt DESC;
