# Admin Objectives

Local route: `/admin/objectives`, available under **System → Objectives**.

The module uses the existing authenticated API, `entity_records`, server audit events, canonical farm/block records and private file service. It introduces no Base44 runtime service, new database or duplicate Daily Task Logs. There is no migration required for the initial module.

## Scope

**Admin (Entire company)** is the default in the **Farm / Company** selector. It stores an empty farm ID, meaning company scope. **A&B (All farms)** includes operational records from either farm while excluding company-only records. All farms and every block returned by the existing APIs appear as explicit alternatives in the same scope dropdown. Selecting a farm clears any previous block; the block list is filtered to that farm. Choosing a block also identifies its parent farm.

## Operational workflow

1. Select a year and create an objective with its owner, category, scope, dates, weight and planned budget.
2. Add sub-objectives and KPIs in the detail tabs. Configure direction, units, targets and the measurement source.
3. In a Daily Task Log, select Related Objective, Related Sub-Objective and Related KPI. Dropdowns cascade; the alignment search filters the options. The server rejects incompatible hierarchy, dates and farm/block assignments.
4. Review execution separately from outcome. Task completion does not substitute for a production or financial KPI result. Missing source records show **No result**.
5. Add evidence, feedback, blockers and corrective actions. Allocate per-farm/block KPI targets in Analytics.
6. Enable weighted annual scoring only when non-cancelled objective weights total 100%. Use Annual Review to record final outcomes and close the cycle.

## Supported automatic calculations

- Yield from Daily Task Logs, in kg or tonnes, honoring explicit zero output after edits.
- Recorded task costs and revenue, in GHS.
- Number of logs and average recorded activity completion.
- Explicit Task KPI relationships, or all eligible Daily Task Logs in an Automatic KPI's scope and period.
- Verified manual actuals and documented additive hybrid adjustments.
- Direction-aware higher/lower/range achievement, weighted KPI/sub-objective scoring and annual scores.
- Schedule expectations, unresolved and critical blockers, overdue linked logs and budget risk in objective health.

Source IDs are deduplicated within calculations. Cancelled, deleted, archived and wrong-year logs are excluded. Changes refresh through existing data-change events, focus refresh and periodic refresh. Closed-cycle snapshots contain the calculated results and source logs and never recalculate from later edits. Annual revisions use a PostgreSQL transaction and advisory lock, so a stale browser cannot overwrite a newer cycle.

## Permissions

Administrators manage objective cycles. Farm managers, farm supervisors and auditors may view them. Only administrators can enter manual results, configure targets or close years. Mutations require the existing session and CSRF token. The generic entity API does not expose ObjectiveCycle, preventing bypass of closed-year restrictions.

## Current boundaries of the larger brief

The initial module uses Daily Task Log output, cost and revenue as its automatic source. Separate Sales, Finance, Harvest, quality ratios and yield-per-hectare source adapters are not included; use verified manual KPIs for these measures. No external business totals are inferred from task completion.

Evidence uses the existing upload service's approved image/video/PDF/DOCX/text formats and 5 MB limit. It is currently attached at objective level. Feedback and blocker entries can describe evidence by reference. Dedicated evidence relationships at every hierarchy level, XLSX/audio upload, scheduled KPI reminders, PDF reports, more advanced comparison charts and granular manager/editor permissions remain outside this initial implementation.

The page exports actual objective summaries to CSV. Task links open the existing Daily Task Log route and select the referenced record. Copying a cycle generates fresh objective/sub-objective/KPI identifiers and resets actuals, evidence, notes, blockers and task links.

## Validation

`objective-model.test.ts` covers direction-aware results, execution versus outcome, edited zero values, exclusions, scope, weighting, hybrid results, blocker health and allocations. `objectives.test.ts` covers role and CSRF protection, audit writes, revision conflicts, closure, historical read-only behavior and frozen results. The API tests mock database writes and do not create business records.

Run `npm run check` for lint, type checks, tests and the frontend production build. Keep all changes local until the owner approves Git/release activity.
