# Guarded braces 3.0.3

MIT-licensed upstream source: https://github.com/micromatch/braces/tree/3.0.3.
This private package preserves the upstream API and guards nesting at 128 levels.
It mitigates GHSA-vfj7-8cjw-p6xm, which currently has no published patched version.
Parsing rejects excessive nesting before recursive cleanup; compile, expand and
stringify validate caller-supplied ASTs iteratively and reject cycles/deep trees.
The root override uses this actual patched implementation, not an audit exception.
Remove the override after a reviewed upstream fix becomes available.
