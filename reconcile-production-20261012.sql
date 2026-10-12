-- Execute only on the isolated candidate br-bitter-wave-aywlfpf6.
-- Render __PRODUCTION_PAYLOAD__ and __IDENTITY_MAP__ as escaped JSON SQL literals.
-- Source and original production databases are never modified by this script.
CREATE TABLE IF NOT EXISTS public.release_identity_archive (
  release_key text NOT NULL, original_user_id text NOT NULL,
  original_record jsonb NOT NULL, archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(release_key, original_user_id)
);
REVOKE ALL ON public.release_identity_archive FROM jba_app_production;
CREATE TABLE IF NOT EXISTS public.release_import_manifest (
  release_key text PRIMARY KEY, summary jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION pg_temp.map_release_identity(value jsonb, old_id text, new_id text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE result jsonb;
BEGIN
  CASE jsonb_typeof(value)
  WHEN 'string' THEN RETURN CASE WHEN value = to_jsonb(old_id) THEN to_jsonb(new_id) ELSE value END;
  WHEN 'array' THEN SELECT coalesce(jsonb_agg(pg_temp.map_release_identity(v,old_id,new_id) ORDER BY n),'[]'::jsonb) INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS e(v,n); RETURN result;
  WHEN 'object' THEN SELECT coalesce(jsonb_object_agg(k,pg_temp.map_release_identity(v,old_id,new_id)),'{}'::jsonb) INTO result FROM jsonb_each(value) AS e(k,v); RETURN result;
  ELSE RETURN value;
  END CASE;
END
$function$;
DO $release$
DECLARE payload jsonb := __PRODUCTION_PAYLOAD__;
DECLARE identity_map jsonb := __IDENTITY_MAP__;
DECLARE mapping jsonb;
DECLARE ref record;
DECLARE original_stage users;
DECLARE table_name text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('production-release-20261012'));
  IF EXISTS (SELECT 1 FROM release_import_manifest WHERE release_key='production-release-20261012') THEN RETURN; END IF;
  IF (SELECT count(*) FROM entity_records) <> 930 THEN RAISE EXCEPTION 'Candidate business baseline changed'; END IF;
  IF jsonb_array_length(payload->'users') <> 5 THEN RAISE EXCEPTION 'Production user baseline changed'; END IF;
  IF jsonb_array_length(identity_map) <> 1 THEN RAISE EXCEPTION 'Expected exactly one approved identity mapping'; END IF;
  FOR mapping IN SELECT value FROM jsonb_array_elements(identity_map) LOOP
    SELECT * INTO STRICT original_stage FROM users WHERE id=mapping->>'old';
    INSERT INTO release_identity_archive(release_key,original_user_id,original_record)
      VALUES ('production-release-20261012',original_stage.id,to_jsonb(original_stage));
    UPDATE users SET email=id||'@retired.migration.invalid',status='suspended',google_subject=NULL WHERE id=original_stage.id;
  END LOOP;
  INSERT INTO users SELECT * FROM jsonb_populate_recordset(NULL::users,payload->'users');
  FOR mapping IN SELECT value FROM jsonb_array_elements(identity_map) LOOP
    UPDATE users p SET google_subject=a.original_record->>'google_subject', page_access=a.original_record->'page_access'
      FROM release_identity_archive a WHERE p.id=mapping->>'new' AND a.original_user_id=mapping->>'old' AND a.release_key='production-release-20261012';
    FOR ref IN
      SELECT cl.relname AS table_name,a.attname AS column_name
      FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
      WHERE c.contype='f' AND c.confrelid='public.users'::regclass
        AND cl.relname NOT IN ('sessions','password_reset_tokens','email_verification_tokens')
    LOOP
      EXECUTE format('UPDATE %I SET %I=$1 WHERE %I=$2',ref.table_name,ref.column_name,ref.column_name)
        USING mapping->>'new',mapping->>'old';
    END LOOP;
    UPDATE entity_records SET data=pg_temp.map_release_identity(data,mapping->>'old',mapping->>'new')
      WHERE entity_name <> 'AuditLog' AND data::text LIKE '%'||(mapping->>'old')||'%';
  END LOOP;
  -- Preserve copied token rows but prevent staging authentication tokens from becoming live production tokens.
  UPDATE sessions SET expires_at=LEAST(expires_at,now());
  UPDATE password_reset_tokens SET expires_at=LEAST(expires_at,now());
  UPDATE email_verification_tokens SET expires_at=LEAST(expires_at,now());
  FOREACH table_name IN ARRAY ARRAY['sessions','password_reset_tokens','rate_limit_windows'] LOOP
    EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_recordset(NULL::%I,$1)',table_name,table_name)
      USING payload->table_name;
  END LOOP;
  IF (SELECT count(*) FROM users) <> 8 THEN RAISE EXCEPTION 'Merged account total incorrect'; END IF;
  IF (SELECT count(*) FROM entity_records) <> 930 THEN RAISE EXCEPTION 'Business records changed during reconciliation'; END IF;
  INSERT INTO release_import_manifest(release_key,summary) VALUES ('production-release-20261012',
    jsonb_build_object('production_users_preserved',5,'staging_users_preserved',3,'mapped_duplicate_accounts',1,'business_records',930,'identity_map',identity_map));
END
$release$;
