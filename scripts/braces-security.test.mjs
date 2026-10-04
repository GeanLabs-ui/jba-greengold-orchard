import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const braces = require('../vendor/braces');

describe('guarded brace expansion', () => {
  it('preserves normal Tailwind glob and range behavior', () => {
    expect(braces('src/**/*.{js,jsx,ts,tsx}', { expand: true })).toEqual(['src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx']);
    expect(braces('{1..3}', { expand: true })).toEqual(['1', '2', '3']);
    expect(braces('a{b,c}')).toEqual(['a(b|c)']);
  });
  it('rejects deeply nested strings before exhausting the call stack', () => {
    const input = '{'.repeat(2000) + 'a,b' + '}'.repeat(2000);
    expect(() => braces(input)).toThrow('safe depth');
    expect(() => braces(input, { expand: true })).toThrow('safe depth');
  });
  it.each(['compile', 'expand', 'stringify'])('guards caller-supplied ASTs in %s', method => {
    let ast = { type: 'text', value: 'x' };
    for (let i = 0; i < 2000; i++) ast = { type: 'root', nodes: [ast] };
    expect(() => braces[method](ast)).toThrow('safe depth');
    const cyclic = { nodes: [] }; cyclic.nodes.push(cyclic);
    expect(() => braces[method](cyclic)).toThrow('safe depth');
  });
});
