// src/routes/api/collision-test/+server.ts
//
// DEV-ONLY sanity check for the collision logic (FR5 + FR8).
// Open http://localhost:5173/api/collision-test — every scenario should say "PASS".
// Delete this file (or keep it as documentation of the test cases) once verified.

import { json } from '@sveltejs/kit';
import { checkCollisions, type CollisionItemInput } from '$lib/utils/collision';

function item(p: Partial<CollisionItemInput> & { id: string }): CollisionItemInput {
  return {
    catalogId: 'K00879',
    category: 'Curbs, Ledges & Tables',
    x: 0, y: 0, width: 308, depth: 140, rotation: 0,
    ...p,
  };
}

export function GET() {
  const scenarios = [
    {
      name: '1. Two rails 3 m apart (zone 1.5 m) -> no conflict',
      items: [
        item({ id: 'a', catalogId: 'R1', category: 'Rails', width: 200, depth: 40 }),
        item({ id: 'b', catalogId: 'R2', category: 'Rails', width: 200, depth: 40, x: 500 }),
      ],
      expect: [] as string[],
    },
    {
      name: '2. Rail 1 m from a ramp (larger zone 2.0 m wins) -> zone warning',
      items: [
        item({ id: 'a', catalogId: 'R1', category: 'Rails', width: 200, depth: 40 }),
        item({ id: 'b', catalogId: 'Q1', category: 'Ramps & Transitions', width: 300, depth: 300, x: 350 }),
      ],
      expect: ['zone'],
    },
    {
      name: '3. Two different modules on top of each other -> overlap error',
      items: [
        item({ id: 'a', catalogId: 'K00878' }),
        item({ id: 'b', catalogId: 'K00879', x: 50 }),
      ],
      expect: ['overlap'],
    },
    {
      name: '4. Two IDENTICAL modules flush side by side (bound) -> no conflict',
      items: [
        item({ id: 'a' }),                       // width 308 -> touches at x=308
        item({ id: 'b', x: 308 }),
      ],
      expect: [],
    },
    {
      name: '5. Same two identical modules 1 m apart (not bound) -> zone warning',
      items: [
        item({ id: 'a' }),
        item({ id: 'b', x: 408 }),
      ],
      expect: ['zone'],
    },
  ];

  const results = scenarios.map(s => {
    const got = checkCollisions(s.items).pairs.map(p => p.type).sort();
    const want = [...s.expect].sort();
    const pass = JSON.stringify(got) === JSON.stringify(want);
    return { scenario: s.name, expected: want, got, result: pass ? 'PASS' : 'FAIL' };
  });

  return json({ allPassed: results.every(r => r.result === 'PASS'), results }, {
    headers: { 'content-type': 'application/json' },
  });
}
