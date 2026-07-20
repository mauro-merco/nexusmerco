-- Migration 00006: Add raw_content column to uploaded_files for CSV storage per client

ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS raw_content TEXT DEFAULT '';
