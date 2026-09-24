-- Publish the approved ten-activity Management Review schedule.
-- Retain all original rows and linked records; only add archive metadata.
-- Already converted local schedules (PH-01 etc.) and other programmes are untouched.
CREATE TEMP TABLE _migration_schedule_originals ON COMMIT DROP AS
SELECT record.* FROM entity_records record
WHERE record.entity_name = 'FarmProject'
  AND record.data->>'programme_code' = 'JBA-EARLY-HARVEST-2026-27'
  AND coalesce(record.data->>'archived_at', '') = ''
  AND EXISTS (
    SELECT 1 FROM entity_records legacy
    WHERE legacy.entity_name = 'FarmProject'
      AND legacy.organization_id IS NOT DISTINCT FROM record.organization_id
      AND legacy.data->>'programme_code' = 'JBA-EARLY-HARVEST-2026-27'
      AND legacy.data->>'project_code' LIKE 'DRC-%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM entity_records approved
    WHERE approved.entity_name = 'FarmProject'
      AND approved.organization_id IS NOT DISTINCT FROM record.organization_id
      AND approved.data->>'programme_code' = 'JBA-EARLY-HARVEST-2026-27'
      AND approved.data->>'project_code' ~ '^PH-[0-9]{2}$'
  );

WITH archived AS (
  UPDATE entity_records record
  SET data = record.data || jsonb_build_object(
    'archived_at', now(),
    'replaced_by_schedule', 'Mango_Post_Harvest_Management_Review_Final (1).xlsx',
    'schedule_migration', '0020_post_harvest_main_activities'
  ), updated_at = now()
  FROM _migration_schedule_originals original
  WHERE record.id = original.id
  RETURNING record.id, record.data
)
INSERT INTO audit_events (id, action, target_table, record_id, old_values, new_values)
SELECT gen_random_uuid()::text, 'update', 'FarmProject', archived.id, original.data, archived.data
FROM archived JOIN _migration_schedule_originals original ON original.id = archived.id;

WITH inserted AS (
  INSERT INTO entity_records (id, entity_name, organization_id, data)
  SELECT 'post-harvest:' || coalesce(scope.organization_id, 'local') || ':JBA-EARLY-HARVEST-2026-27:' || (activity->>'sequence'),
    'FarmProject', scope.organization_id,
    jsonb_build_object(
      'programme_code', 'JBA-EARLY-HARVEST-2026-27',
      'project_code', 'PH-' || lpad(activity->>'sequence', 2, '0'),
      'milestone_code', 'PH-' || lpad(activity->>'sequence', 2, '0'),
      'project_type', 'master_schedule_task', 'title', activity->>'name',
      'activity_id', activity->>'id', 'activity_sequence', (activity->>'sequence')::integer,
      'timing', activity->>'timing', 'success_criteria', activity->>'readiness',
      'source', 'Mango_Post_Harvest_Management_Review_Final (1).xlsx',
      'is_enabled', true, 'priority', 'Medium', 'status', 'not_started', 'progress_percent', 0,
      'start_date', '', 'due_date', '', 'owner_id', '', 'owner_name', '', 'notes', '',
      'schedule_migration', '0020_post_harvest_main_activities'
    )
  FROM (SELECT DISTINCT organization_id FROM _migration_schedule_originals) scope
  CROSS JOIN jsonb_array_elements('[{"id":"review-1","name":"FARM SANITATION","timing":"Immediately after harvest; complete within Week 1.","readiness":"• Fallen or rotten mangoes removed from the orchard.\n• Diseased or mummified fruit removed.\n• Pest-infested plant material removed/destroyed appropriately.\n• Dead branches and major sources of infection removed.\n• Orchard floor visibly clean with minimal decaying fruit.","sequence":1},{"id":"review-2","name":"POST-HARVEST PRUNING","timing":"Approximately Week 1–2 after harvest. Prune soon after harvest rather than delaying.","readiness":"• Dead, diseased, crossing and overcrowded branches removed.\n• Center of canopy opened for sunlight and air penetration.\n• Excessive tree height reduced where necessary for manageable spraying and harvesting.\n• Tree retains a balanced canopy; avoid excessive pruning.","sequence":2},{"id":"review-3","name":"NEW VEGETATIVE FLUSH / RECOVERY","timing":"Monitor after pruning, generally from Week 2 onward.","readiness":"• Healthy new shoots emerging across productive terminals.\n• New leaves initially soft/light green and actively expanding.\n• No significant insect, fungal or dieback damage on new flush.\n• Adequate soil moisture and no obvious tree stress.","sequence":3},{"id":"review-4","name":"POST-HARVEST NUTRITION & ORCHARD MANAGEMENT","timing":"Begin after pruning/new growth starts; exact fertilizer timing should follow tree condition and soil/leaf analysis.","readiness":"• New flush developing uniformly.\n• Leaves show healthy color without obvious nutrient-deficiency symptoms.\n• Soil moisture is adequate; weeds are controlled around the tree zone.\n• Trees are recovering strongly from harvest and pruning.","sequence":4},{"id":"review-5","name":"PAKLO APPLICATION — VERIFY ACTIVE INGREDIENT","timing":"Approximately 1 month after pruning ONLY when leaves/flush are sufficiently mature and the product/rate is agronomically confirmed.","readiness":"• Leaves have matured before application.\n• Majority of target leaves are firm and darkening toward deep green.\n• Avoid application while the flush is soft, pale green or actively expanding.\n• IMPORTANT: If Paklo is paclobutrazol, manage it as a plant growth regulator—not as fertilizer.","sequence":5},{"id":"review-6","name":"SHOOT MATURATION / REST PERIOD","timing":"Following Paklo treatment; monitor tree readiness rather than relying on calendar timing alone.","readiness":"• Approximately 80–90% of target terminal leaves are deep green and mature.\n• Leaves are firm/leathery rather than soft.\n• Little or no active vegetative flushing.\n• Terminal shoots appear mature and physiologically rested.","sequence":6},{"id":"review-7","name":"BEGIN FLOWER INDUCTION","timing":"Approximately 3 months after Paklo application, SUBJECT TO tree readiness and agronomic program.","readiness":"• 80–90% of leaves are deep green.\n• Canopy appears predominantly mature green.\n• No significant new shoots or active vegetative growth.\n• Mature terminal buds are present and trees are not under severe stress.\n• Proceed based on observable maturity—not date alone.","sequence":7},{"id":"review-8","name":"FLOWERING → FRUIT SET → FRUIT DEVELOPMENT & MATURITY","timing":"Begins after successful flower induction. Monitor flowering and fruit set, then manage the crop through fruit development until harvest maturity (typically about 100–150 days from flowering, depending on variety, climate and orchard conditions).","readiness":"• Flower panicles emerge and expand from mature terminal buds.\n• Flowers open normally with good pollinator activity and limited disease damage.\n• Successful fruit set is visible as small pea-sized mangoes retained on panicles after natural early fruit drop.\n• Developing fruit increases steadily in size; canopy remains healthy and trees show no severe water or nutrient stress.\n• Monitor closely for anthracnose, powdery mildew, fruit flies and other pests/diseases during flowering and fruit development.\n• As maturity approaches, fruit shoulders fill out and rise near/above the stem attachment; skin color may lighten depending on variety.\n• Harvest only when fruit has reached physiological maturity appropriate for the target market—not simply by calendar date.","sequence":8},{"id":"review-9","name":"HARVESTING","timing":"Harvest when fruit has reached physiological maturity and meets the maturity specification for the intended market.","readiness":"","sequence":9},{"id":"review-10","name":"Management control","timing":"Calendar timing is a planning guide.","readiness":"Physical tree readiness should be confirmed before Paklo or flower-induction treatment.","sequence":10}]'::jsonb) activity
  RETURNING id, data
)
INSERT INTO audit_events (id, action, target_table, record_id, new_values)
SELECT gen_random_uuid()::text, 'create', 'FarmProject', id, data FROM inserted;
