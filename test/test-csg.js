/**
 * Tests for CSG runtime edge cases — empty/degenerate geometry.
 * Run with: node test/test-csg.js
 */
'use strict';

// csg.js IIFE assigns CSG and CAG onto `this` (module.exports in Node)
var csgModule = require('../blockscad/csg.js');

var CSG = csgModule.CSG;
var CAG = csgModule.CAG;

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(msg);
    console.error('  FAIL: ' + msg);
  }
}

// ============================================================
// HULL 3D — regression tests for empty-input crash fix
// ============================================================

(function testHull3D() {
  console.log('--- Hull 3D ---');

  // hull with two empty CSGs should not throw
  var a = new CSG();
  var b = new CSG();
  var threw = false;
  try {
    var result = a.hull([b]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'hull of two empty CSGs should not throw');
  assert(result.polygons.length === 0, 'hull of two empty CSGs returns empty CSG');

  // hull with fewer than 4 unique points (collinear) — should return empty, not crash
  threw = false;
  try {
    // Create a CSG with a single triangle polygon — only 3 coplanar points
    var tri = CSG.Polygon.createFromPoints([[0,0,0],[1,0,0],[2,0,0]]);
    var singlePoly = CSG.fromPolygons([tri]);
    result = singlePoly.hull([]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'hull with collinear points should not throw');

  // hull of two spheres — sanity check that it produces geometry
  var s1 = CSG.sphere({ center: [-2, 0, 0], radius: 1, res: 6 });
  var s2 = CSG.sphere({ center: [2, 0, 0], radius: 1, res: 6 });
  threw = false;
  try {
    result = s1.hull([s2]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'hull of two spheres should not throw');
  assert(result.polygons.length > 0, 'hull of two spheres produces polygons');
})();

// ============================================================
// toTriangles — unsafe poly.vertices[0] on empty polygon list
// ============================================================

(function testToTriangles() {
  console.log('--- toTriangles ---');

  // toTriangles on empty CSG
  var empty = new CSG();
  var threw = false;
  var result;
  try {
    result = empty.toTriangles();
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'toTriangles on empty CSG should not throw');
  assert(Array.isArray(result) && result.length === 0, 'toTriangles on empty CSG returns empty array');

  // toTriangles on a cube — should produce triangulated polygons
  var cube = CSG.cube({ radius: [1, 1, 1] });
  threw = false;
  try {
    result = cube.toTriangles();
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'toTriangles on cube should not throw');
  assert(result.length > 0, 'toTriangles on cube returns polygons');
  // Every resulting polygon should have exactly 3 vertices (triangles)
  var allTriangles = result.every(function(p) { return p.vertices.length === 3; });
  assert(allTriangles, 'toTriangles produces only triangles');
})();

// ============================================================
// CAG hull 2D — sparse array bug in ConvexHull.compute
// ============================================================

(function testHull2D() {
  console.log('--- Hull 2D (CAG) ---');

  // hull of two circles
  var c1 = CAG.circle({ center: [-3, 0], radius: 1, resolution: 8 });
  var c2 = CAG.circle({ center: [3, 0], radius: 1, resolution: 8 });
  var threw = false;
  var result;
  try {
    result = c1.hull([c2]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, '2D hull of two circles should not throw');
  assert(result.sides.length > 0, '2D hull of two circles produces sides');

  // hull of two rectangles
  var r1 = CAG.rectangle({ center: [0, 0], radius: [1, 1] });
  var r2 = CAG.rectangle({ center: [5, 0], radius: [1, 1] });
  threw = false;
  try {
    result = r1.hull([r2]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, '2D hull of two rectangles should not throw');
  assert(result.sides.length > 0, '2D hull of two rectangles produces sides');

  // hull with collinear points (thin rectangle — all points on two lines)
  var thin = CAG.fromPoints([{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 0.001}, {x: 0, y: 0.001}]);
  threw = false;
  try {
    result = thin.hull([]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, '2D hull with near-collinear points should not throw');
})();

// ============================================================
// CSG.Polygon.createFromPoints — < 3 points
// ============================================================

(function testPolygonCreateFromPoints() {
  console.log('--- Polygon.createFromPoints edge cases ---');

  // With < 3 points, the constructor tries vertices[0].pos, vertices[1].pos, vertices[2].pos
  // It should throw a clear error, not a cryptic "Cannot read property 'pos' of undefined"
  var threw = false;
  var errorMsg = '';
  try {
    CSG.Polygon.createFromPoints([[0, 0, 0], [1, 0, 0]]);
  } catch (e) {
    threw = true;
    errorMsg = String(e);
  }
  assert(threw, 'createFromPoints with 2 points should throw (need >= 3 for a plane)');

  // With 0 points
  threw = false;
  try {
    CSG.Polygon.createFromPoints([]);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'createFromPoints with 0 points should throw');

  // With 3 valid points — should succeed
  threw = false;
  var poly;
  try {
    poly = CSG.Polygon.createFromPoints([[0,0,0],[1,0,0],[0,1,0]]);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'createFromPoints with 3 valid points should not throw');
  assert(poly && poly.vertices.length === 3, 'createFromPoints with 3 points creates polygon with 3 vertices');
})();

// ============================================================
// SUMMARY
// ============================================================

console.log('\n========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) { console.log('  - ' + e); });
  process.exit(1);
} else {
  console.log('All tests passed.');
  process.exit(0);
}
