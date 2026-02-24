/**
 * Tests for OpenSCAD parser + AST-to-XML converter.
 * Run with: node test/test-parser.js
 */
'use strict';

global.window = global;

require('../blockscad/openscad-to-blocks.js');
require('../blockscad/ast-to-xml.js');
require('../blockscad/ast-to-xml-statements.js');

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

function assertContains(xml, substr, msg) {
  assert(xml.indexOf(substr) !== -1, msg + ' — expected to contain: ' + substr);
}

function convert(code) {
  return BlockscadOpenscadToBlocks.convert(code);
}

// ============================================================
// TOKENIZER TESTS
// ============================================================

(function testTokenizer() {
  console.log('--- Tokenizer ---');
  var T = window._OpenSCADParserInternals;

  var tokens = T.tokenize('sphere(r=5);');
  assert(tokens.length === 8, 'sphere(r=5); should produce 8 tokens (incl EOF)');
  assert(tokens[0].type === 'IDENTIFIER' && tokens[0].value === 'sphere', 'first token is sphere');
  assert(tokens[1].type === 'LPAREN', 'second token is LPAREN');
  assert(tokens[2].type === 'IDENTIFIER' && tokens[2].value === 'r', 'third token is r');
  assert(tokens[3].type === 'EQUALS', 'fourth token is EQUALS');
  assert(tokens[4].type === 'NUMBER' && tokens[4].value === '5', 'fifth token is NUMBER 5');

  tokens = T.tokenize('// comment\n42');
  assert(tokens.length === 2, 'comment + number = 2 tokens');
  assert(tokens[0].type === 'NUMBER', 'first non-comment token is NUMBER');

  tokens = T.tokenize('/* block */ 3.14');
  assert(tokens.length === 2, 'block comment + number = 2 tokens');

  tokens = T.tokenize('a == b != c <= d >= e && f || g');
  var ops = tokens.filter(function(t) { return t.type !== 'IDENTIFIER' && t.type !== 'EOF'; });
  assert(ops.length === 6, 'should find 6 operators');

  tokens = T.tokenize('"hello world"');
  assert(tokens[0].type === 'STRING' && tokens[0].value === 'hello world', 'string token');

  tokens = T.tokenize('0xFF');
  assert(tokens[0].type === 'NUMBER' && tokens[0].value === '0xFF', 'hex number');
})();

// ============================================================
// PARSER TESTS
// ============================================================

(function testParser() {
  console.log('--- Parser ---');
  var T = window._OpenSCADParserInternals;

  function parse(code) {
    var tokens = T.tokenize(code);
    var p = new T.Parser(tokens);
    return { ast: p.parseProgram(), errors: p.errors };
  }

  var r = parse('x = 5;');
  assert(r.errors.length === 0, 'assignment parses without errors');
  assert(r.ast.length === 1 && r.ast[0].type === 'Assignment', 'assignment produces Assignment node');
  assert(r.ast[0].name === 'x', 'assignment name is x');

  r = parse('sphere(r=10);');
  assert(r.errors.length === 0, 'sphere parses without errors');
  assert(r.ast[0].type === 'ModuleCall' && r.ast[0].name === 'sphere', 'sphere ModuleCall');
  assert(r.ast[0].args[0].type === 'NamedArg' && r.ast[0].args[0].name === 'r', 'named arg r');

  r = parse('translate([1,2,3]){ cube([4,5,6]); }');
  assert(r.errors.length === 0, 'translate+cube parses without errors');
  assert(r.ast[0].children.length === 1, 'translate has 1 child');
  assert(r.ast[0].children[0].name === 'cube', 'child is cube');

  r = parse('for(i=[0:1:10]){ sphere(r=i); }');
  assert(r.errors.length === 0, 'for loop parses without errors');
  assert(r.ast[0].type === 'ForLoop', 'for loop node type');
  assert(r.ast[0].varName === 'i', 'loop var is i');
  assert(r.ast[0].step !== null, 'step expression exists');

  r = parse('for(i=[0:10]){ sphere(r=i); }');
  assert(r.errors.length === 0, 'for loop without step parses');
  assert(r.ast[0].step === null, 'step is null when not specified');

  r = parse('if(x > 5){ cube([1,1,1]); } else { sphere(r=1); }');
  assert(r.errors.length === 0, 'if/else parses without errors');
  assert(r.ast[0].type === 'IfElse', 'if/else node type');
  assert(r.ast[0].elseBody !== null, 'else body exists');

  r = parse('if(a){ } else if(b){ } else { }');
  assert(r.errors.length === 0, 'if/else if/else parses');
  assert(r.ast[0].elseBody[0].type === 'IfElse', 'else-if chain');

  r = parse('z = a + b * c - d;');
  assert(r.errors.length === 0, 'expression in assignment parses');
  assert(r.ast[0].type === 'Assignment', 'expression assignment node');

  r = parse('z = x > 0 ? x : -x;');
  assert(r.errors.length === 0, 'ternary in assignment parses');
  assert(r.ast[0].value.type === 'TernaryOp', 'ternary expression node');

  r = parse('module foo() { }');
  assert(r.errors.length > 0, 'module definition produces error');

  r = parse('function bar(x) = x * 2;');
  assert(r.errors.length > 0, 'function definition produces error');

  r = parse('difference(){ cube([10,10,10]); sphere(r=5); cylinder(r=3, h=20); }');
  assert(r.errors.length === 0, 'difference with 3 children parses');
  assert(r.ast[0].children.length === 3, 'difference has 3 children');
})();

// ============================================================
// XML GENERATOR TESTS — PRIMITIVES
// ============================================================

(function testPrimitives() {
  console.log('--- Primitives ---');

  var r = convert('sphere(r=5);');
  assert(r.success, 'sphere converts successfully');
  assertContains(r.xml, 'type="sphere"', 'sphere block type');
  assertContains(r.xml, '<field name="MEASURE">radius</field>', 'sphere measure=radius');
  assertContains(r.xml, '<field name="NUM">5</field>', 'sphere radius value');

  r = convert('sphere(d=10);');
  assert(r.success, 'sphere diameter converts');
  assertContains(r.xml, '<field name="MEASURE">diameter</field>', 'sphere measure=diameter');
  assertContains(r.xml, '<field name="NUM">10</field>', 'sphere diameter value');

  r = convert('cube([10, 20, 30], center=true);');
  assert(r.success, 'cube converts');
  assertContains(r.xml, 'type="cube"', 'cube block type');
  assertContains(r.xml, '<field name="CENTERDROPDOWN">true</field>', 'cube centered');
  assertContains(r.xml, '<value name="XVAL">', 'cube XVAL');
  assertContains(r.xml, '<field name="NUM">10</field>', 'cube X=10');
  assertContains(r.xml, '<field name="NUM">20</field>', 'cube Y=20');
  assertContains(r.xml, '<field name="NUM">30</field>', 'cube Z=30');

  r = convert('cylinder(r1=5, r2=3, h=20, center=false);');
  assert(r.success, 'cylinder converts');
  assertContains(r.xml, 'type="cylinder"', 'cylinder block type');
  assertContains(r.xml, '<field name="MEASURE">radius</field>', 'cylinder measure=radius');
  assertContains(r.xml, '<field name="CENTERDROPDOWN">false</field>', 'cylinder not centered');
  assertContains(r.xml, '<value name="RAD1">', 'cylinder RAD1');
  assertContains(r.xml, '<value name="RAD2">', 'cylinder RAD2');
  assertContains(r.xml, '<value name="HEIGHT">', 'cylinder HEIGHT');

  r = convert('cylinder(r=5, h=10, center=true);');
  assert(r.success, 'cylinder with r= converts');
  assertContains(r.xml, '<field name="NUM">5</field>', 'cylinder r=5 appears');

  r = convert('circle(r=8);');
  assert(r.success, 'circle converts');
  assertContains(r.xml, 'type="circle"', 'circle block type');

  r = convert('square([15, 25], center=true);');
  assert(r.success, 'square converts');
  assertContains(r.xml, 'type="square"', 'square block type');
  assertContains(r.xml, '<field name="CENTERDROPDOWN">true</field>', 'square centered');
})();

// ============================================================
// XML GENERATOR TESTS — TRANSFORMS
// ============================================================

(function testTransforms() {
  console.log('--- Transforms ---');

  var r = convert('translate([10, 20, 30]){ sphere(r=5); }');
  assert(r.success, 'translate converts');
  assertContains(r.xml, 'type="translate"', 'translate block type');
  assertContains(r.xml, '<value name="XVAL">', 'translate XVAL');
  assertContains(r.xml, '<statement name="A">', 'translate child in A');
  assertContains(r.xml, 'type="sphere"', 'child sphere');

  r = convert('translate([1,2,3]){ cube([1,1,1]); sphere(r=1); }');
  assert(r.success, 'translate with 2 children converts');
  assertContains(r.xml, '<mutation plus="1">', 'translate mutation plus=1 for 2 children');
  assertContains(r.xml, '<statement name="A">', 'first child in A');
  assertContains(r.xml, '<statement name="PLUS1">', 'second child in PLUS1');

  r = convert('rotate([90, 0, 0]){ cube([1,1,1]); }');
  assert(r.success, 'simple rotate converts');
  assertContains(r.xml, 'type="simplerotate"', 'simplerotate block type');

  r = convert('rotate(a=45, v=[0, 0, 1]){ sphere(r=1); }');
  assert(r.success, 'fancy rotate converts');
  assertContains(r.xml, 'type="fancyrotate"', 'fancyrotate block type');
  assertContains(r.xml, '<value name="AVAL">', 'fancy rotate AVAL');

  r = convert('scale([2, 2, 2]){ cube([5,5,5]); }');
  assert(r.success, 'scale converts');
  assertContains(r.xml, 'type="scale"', 'scale block type');

  r = convert('mirror([1, 0, 0]){ sphere(r=5); }');
  assert(r.success, 'mirror converts');
  assertContains(r.xml, 'type="fancymirror"', 'fancymirror block type');
})();

// ============================================================
// XML GENERATOR TESTS — SET OPERATIONS
// ============================================================

(function testSetOps() {
  console.log('--- Set Operations ---');

  var r = convert('union(){ cube([1,1,1]); sphere(r=1); }');
  assert(r.success, 'union converts');
  assertContains(r.xml, 'type="union"', 'union block type');
  assertContains(r.xml, '<statement name="A">', 'union first child A');
  assertContains(r.xml, '<statement name="PLUS0">', 'union second child PLUS0');

  r = convert('union(){ cube([1,1,1]); sphere(r=1); cylinder(r=1, h=1); }');
  assert(r.success, 'union 3 children converts');
  assertContains(r.xml, '<mutation plus="1">', 'union mutation plus=1 for 3 children');
  assertContains(r.xml, '<statement name="PLUS1">', 'union third child PLUS1');

  r = convert('difference(){ cube([10,10,10]); sphere(r=7); }');
  assert(r.success, 'difference converts');
  assertContains(r.xml, 'type="difference"', 'difference block type');
  assertContains(r.xml, '<statement name="A">', 'difference first child A');
  assertContains(r.xml, '<statement name="MINUS0">', 'difference second child MINUS0');

  r = convert('difference(){ cube([10,10,10]); sphere(r=7); cylinder(r=3, h=20); }');
  assert(r.success, 'difference 3 children');
  assertContains(r.xml, '<mutation minus="1">', 'difference mutation minus=1 for 3 children');
  assertContains(r.xml, '<statement name="MINUS1">', 'difference third child MINUS1');

  r = convert('intersection(){ cube([10,10,10]); sphere(r=7); }');
  assert(r.success, 'intersection converts');
  assertContains(r.xml, 'type="intersection"', 'intersection block type');
  assertContains(r.xml, '<statement name="WITH0">', 'intersection WITH0');

  r = convert('hull(){ sphere(r=1); sphere(r=2); }');
  assert(r.success, 'hull converts');
  assertContains(r.xml, 'type="hull"', 'hull block type');
})();

// ============================================================
// XML GENERATOR TESTS — EXTRUSIONS
// ============================================================

(function testExtrusions() {
  console.log('--- Extrusions ---');

  var r = convert('linear_extrude(height=10, twist=45, scale=[1, 1], center=false){ circle(r=5); }');
  assert(r.success, 'linear_extrude converts');
  assertContains(r.xml, 'type="linearextrude"', 'linearextrude block type');
  assertContains(r.xml, '<value name="HEIGHT">', 'extrude HEIGHT');
  assertContains(r.xml, '<value name="TWIST">', 'extrude TWIST');
  assertContains(r.xml, '<statement name="A">', 'extrude child A');

  r = convert('rotate_extrude($fn=32){ circle(r=5); }');
  assert(r.success, 'rotate_extrude converts');
  assertContains(r.xml, 'type="rotateextrude"', 'rotateextrude block type');
  assertContains(r.xml, '<value name="FACES">', 'rotate_extrude FACES');
})();

// ============================================================
// XML GENERATOR TESTS — COLOR
// ============================================================

(function testColor() {
  console.log('--- Color ---');

  var r = convert('color([1, 0, 0]){ sphere(r=5); }');
  assert(r.success, 'color converts');
  assertContains(r.xml, 'type="color"', 'color block type');
  assertContains(r.xml, 'type="colour_picker"', 'colour_picker sub-block');
  assertContains(r.xml, '#ff0000', 'red color hex');

  r = convert('color([0, 1, 0]){ cube([1,1,1]); }');
  assert(r.success, 'green color converts');
  assertContains(r.xml, '#00ff00', 'green color hex');

  r = convert('color([0, 0, 1]){ cube([1,1,1]); }');
  assert(r.success, 'blue color converts');
  assertContains(r.xml, '#0000ff', 'blue color hex');
})();

// ============================================================
// XML GENERATOR TESTS — VARIABLES
// ============================================================

(function testVariables() {
  console.log('--- Variables ---');

  var r = convert('x = 5;');
  assert(r.success, 'variable assignment converts');
  assertContains(r.xml, 'type="variables_set"', 'variables_set block type');
  assertContains(r.xml, '<field name="VAR">x</field>', 'variable name');
  assertContains(r.xml, '<field name="NUM">5</field>', 'variable value');

  r = convert('x = 5;\ny = 10;');
  assert(r.success, 'two assignments convert');
  assertContains(r.xml, '<next>', 'assignments chained with next');

  r = convert('width = 20;\ncube([width, width, width]);');
  assert(r.success, 'variable + usage converts');
  assertContains(r.xml, 'type="variables_set"', 'variables_set');
  assertContains(r.xml, 'type="variables_get"', 'variables_get in cube');
})();

// ============================================================
// XML GENERATOR TESTS — EXPRESSIONS
// ============================================================

(function testExpressions() {
  console.log('--- Expressions ---');

  var r = convert('x = 3 + 4;');
  assert(r.success, 'addition converts');
  assertContains(r.xml, 'type="math_arithmetic"', 'math_arithmetic block');
  assertContains(r.xml, '<field name="OP">ADD</field>', 'ADD op');

  r = convert('x = 3 * 4;');
  assert(r.success, 'multiplication converts');
  assertContains(r.xml, '<field name="OP">MULTIPLY</field>', 'MULTIPLY op');

  r = convert('x = pow(2, 8);');
  assert(r.success, 'pow converts');
  assertContains(r.xml, '<field name="OP">POWER</field>', 'POWER op');

  r = convert('x = sin(45);');
  assert(r.success, 'sin converts');
  assertContains(r.xml, 'type="math_single"', 'math_single block');
  assertContains(r.xml, '<field name="OP">SIN</field>', 'SIN op');

  r = convert('x = cos(90);');
  assert(r.success, 'cos converts');
  assertContains(r.xml, '<field name="OP">COS</field>', 'COS op');

  r = convert('x = sqrt(16);');
  assert(r.success, 'sqrt converts');
  assertContains(r.xml, '<field name="OP">ROOT</field>', 'ROOT op');

  r = convert('x = abs(-5);');
  assert(r.success, 'abs converts');
  assertContains(r.xml, '<field name="OP">ABS</field>', 'ABS op');

  r = convert('x = round(3.7);');
  assert(r.success, 'round converts');
  assertContains(r.xml, 'type="math_round"', 'math_round block');
  assertContains(r.xml, '<field name="OP">ROUND</field>', 'ROUND op');

  r = convert('x = ceil(3.2);');
  assert(r.success, 'ceil converts');
  assertContains(r.xml, '<field name="OP">ROUNDUP</field>', 'ROUNDUP op');

  r = convert('x = floor(3.9);');
  assert(r.success, 'floor converts');
  assertContains(r.xml, '<field name="OP">ROUNDDOWN</field>', 'ROUNDDOWN op');

  r = convert('x = ln(10);');
  assert(r.success, 'ln converts');
  assertContains(r.xml, '<field name="OP">LN</field>', 'LN op');

  r = convert('x = exp(1);');
  assert(r.success, 'exp converts');
  assertContains(r.xml, '<field name="OP">EXP</field>', 'EXP op');

  r = convert('x = log(100);');
  assert(r.success, 'log converts');
  assertContains(r.xml, '<field name="OP">LOG10</field>', 'LOG10 op');

  r = convert('x = true;');
  assert(r.success, 'bool true converts');
  assertContains(r.xml, 'type="logic_boolean"', 'logic_boolean block');
  assertContains(r.xml, '<field name="BOOL">TRUE</field>', 'TRUE value');

  r = convert('x = a > b ? a : b;');
  assert(r.success, 'ternary converts');
  assertContains(r.xml, 'type="logic_ternary"', 'logic_ternary block');

  r = convert('x = a == b;');
  assert(r.success, 'equality converts');
  assertContains(r.xml, 'type="logic_compare"', 'logic_compare block');
  assertContains(r.xml, '<field name="OP">EQ</field>', 'EQ op');

  r = convert('x = a && b;');
  assert(r.success, 'logical and converts');
  assertContains(r.xml, 'type="logic_operation"', 'logic_operation block');
  assertContains(r.xml, '<field name="OP">AND</field>', 'AND op');

  r = convert('x = !flag;');
  assert(r.success, 'logical not converts');
  assertContains(r.xml, 'type="logic_negate"', 'logic_negate block');
})();

// ============================================================
// XML GENERATOR TESTS — LOOPS
// ============================================================

(function testLoops() {
  console.log('--- Loops ---');

  var r = convert('for(i=[0:1:10]){ translate([i*10, 0, 0]){ sphere(r=5); } }');
  assert(r.success, 'for loop converts');
  assertContains(r.xml, 'type="controls_for"', 'controls_for block type');
  assertContains(r.xml, '<field name="VAR">i</field>', 'loop variable');
  assertContains(r.xml, '<value name="FROM">', 'FROM value');
  assertContains(r.xml, '<value name="TO">', 'TO value');
  assertContains(r.xml, '<value name="BY">', 'BY value');
  assertContains(r.xml, '<statement name="DO">', 'DO statement');
})();

// ============================================================
// XML GENERATOR TESTS — IF/ELSE
// ============================================================

(function testIfElse() {
  console.log('--- If/Else ---');

  var r = convert('if(x > 5){ cube([1,1,1]); }');
  assert(r.success, 'simple if converts');
  assertContains(r.xml, 'type="controls_if"', 'controls_if block type');
  assertContains(r.xml, '<value name="IF0">', 'IF0 condition');
  assertContains(r.xml, '<statement name="DO0">', 'DO0 body');

  r = convert('if(x > 5){ cube([1,1,1]); } else { sphere(r=1); }');
  assert(r.success, 'if/else converts');
  assertContains(r.xml, '<mutation elseif="0" else="1">', 'if/else mutation');
  assertContains(r.xml, '<statement name="ELSE">', 'ELSE body');

  r = convert('if(a){ cube([1,1,1]); } else if(b){ sphere(r=1); } else { cylinder(r=1, h=1); }');
  assert(r.success, 'if/else if/else converts');
  assertContains(r.xml, '<mutation elseif="1" else="1">', 'elseif mutation');
  assertContains(r.xml, '<value name="IF1">', 'IF1 condition');
  assertContains(r.xml, '<statement name="DO1">', 'DO1 body');
})();

// ============================================================
// XML GENERATOR TESTS — DIAMETER PATTERNS
// ============================================================

(function testDiameterPatterns() {
  console.log('--- Diameter patterns ---');

  // The generator outputs r=(D)/2 for diameter mode; when parsing back, detect this pattern
  var r = convert('sphere(r=(10) / 2);');
  assert(r.success, 'sphere diameter pattern converts');
  assertContains(r.xml, '<field name="MEASURE">diameter</field>', 'detected diameter mode');

  r = convert('cylinder(r1=(8) / 2, r2=(8) / 2, h=20, center=true);');
  assert(r.success, 'cylinder diameter pattern converts');
  assertContains(r.xml, '<field name="MEASURE">diameter</field>', 'cylinder detected diameter mode');
})();

// ============================================================
// XML GENERATOR TESTS — COMPLEX/NESTED
// ============================================================

(function testComplex() {
  console.log('--- Complex/Nested ---');

  var code = [
    'width = 20;',
    'height = 10;',
    'difference(){',
    '  cube([width, width, height], center=true);',
    '  translate([0, 0, 2]){',
    '    cylinder(r=width / 3, h=height, center=true);',
    '  }',
    '}'
  ].join('\n');
  var r = convert(code);
  assert(r.success, 'complex nested code converts');
  assertContains(r.xml, 'type="variables_set"', 'has variable set');
  assertContains(r.xml, 'type="difference"', 'has difference');
  assertContains(r.xml, 'type="translate"', 'has translate');
  assertContains(r.xml, 'type="cylinder"', 'has cylinder');
  assertContains(r.xml, 'type="variables_get"', 'has variable get');

  code = [
    'for(i=[0:5:360]){',
    '  rotate([0, 0, i]){',
    '    translate([20, 0, 0]){',
    '      sphere(r=3);',
    '    }',
    '  }',
    '}'
  ].join('\n');
  r = convert(code);
  assert(r.success, 'loop with nested transforms converts');
  assertContains(r.xml, 'type="controls_for"', 'has for loop');
  assertContains(r.xml, 'type="simplerotate"', 'has rotate');
  assertContains(r.xml, 'type="translate"', 'has translate');
  assertContains(r.xml, 'type="sphere"', 'has sphere');
})();

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

(function testErrors() {
  console.log('--- Error handling ---');

  var r = convert('module foo() { cube([1,1,1]); }');
  assert(!r.success, 'module definition produces error');
  assert(r.errors.length > 0, 'has error messages');

  r = convert('function bar(x) = x * 2;');
  assert(!r.success, 'function definition produces error');

  r = convert('include <lib.scad>;');
  assert(!r.success, 'include produces error');
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
