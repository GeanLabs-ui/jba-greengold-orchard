'use strict';

// Validate iteratively before any recursive AST traversal, including caller-supplied ASTs.
module.exports = function assertDepth(ast) {
  const pending = [{ node: ast, depth: 0 }];
  const seen = new Set();
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (!node || typeof node !== 'object') continue;
    if (depth > 128 || seen.has(node)) throw new SyntaxError('Brace pattern nesting exceeds safe depth');
    seen.add(node);
    for (const child of node.nodes || []) pending.push({ node: child, depth: depth + 1 });
  }
};
