ALTER TABLE members
  ADD COLUMN recovery_key_hash TEXT,
  ADD COLUMN recovery_key_ciphertext TEXT;

UPDATE members
SET
  recovery_key_hash = 'legacy_removed',
  recovery_key_ciphertext = 'legacy_removed'
WHERE recovery_key_hash IS NULL
   OR recovery_key_ciphertext IS NULL;

ALTER TABLE members
  ALTER COLUMN recovery_key_hash SET NOT NULL,
  ALTER COLUMN recovery_key_ciphertext SET NOT NULL;
