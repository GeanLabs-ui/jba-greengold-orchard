# Cost breakdown background

The interactive chart is rendered from Daily Activity cost records in `apps/web/src/components/farm/CostBreakdown.jsx`. Its amounts, percentages, segments, category details and farm details are live UI, not baked into the image.

Background asset: `apps/web/public/images/analytics/cost-warehouse.png`.

Generated using the built-in image tool, editing the supplied `asserts/ChatGPT Image Sep 23, 2026, 02_46_04 PM.png`. The background is a reconstructed plate; it is not a pixel-identical extraction.

Final prompt:

> Edit target: supplied cost breakdown reference. Create a clean background plate for the interactive web chart. Remove ALL foreground graphics: doughnut chart, every label, every text and number, connector lines, icons, shadows of chart, and bottom card. Preserve/reconstruct ONLY the original very pale white-blue photorealistic warehouse interior with roof trusses, columns and windows, same camera perspective, brightness and washed-out subtle contrast. Full frame 16:9 landscape. No text, chart, icons or UI elements anywhere. This will be the backdrop behind code-rendered live chart. Keep background architecture as close as possible to reference.

Category percentages retain one decimal, with `<0.1%` for small nonzero costs. Zero-cost categories have labels and can open an empty details view, but do not receive fictional chart slices. Local and cross-tab data-change subscriptions in the existing activity screen refresh the supplied data after system edits; an open details dialog recomputes from those updated props.
