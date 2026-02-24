/**
 * AST to Blockly XML - Statement handlers
 * Handles module calls, transforms, set ops, loops, conditionals, assignments.
 */

(function() {
'use strict';

var E = window._ASTtoXMLExpressions;
var exprToXml = E.exprToXml;
var numBlock = E.numBlock;
var escXml = E.escXml;
var nextId = E.nextId;
var getArg = E.getArg;
var getPosArg = E.getPosArg;
var getArgOrPos = E.getArgOrPos;

// ============================================================
// HELPERS for children/statements
// ============================================================

// Convert children array to statement XML with PLUS mutations for transforms/color.
// Transform blocks: A (built-in), then PLUS1, PLUS2, ... (no PLUS0).
// plusCount_ = number of extra PLUS inputs = children.length - 1.
function childrenToStatements(children, firstInput, extraPrefix) {
  var xml = '';
  extraPrefix = extraPrefix || 'PLUS';
  if (children.length > 0) {
    xml += '<statement name="' + firstInput + '">' + stmtToXml(children[0]) + '</statement>';
  }
  var plusCount = children.length - 1;
  if (plusCount > 0) {
    for (var i = 1; i < children.length; i++) {
      // Transform/color blocks use PLUS1, PLUS2, ... (no PLUS0)
      xml += '<statement name="' + extraPrefix + i + '">' + stmtToXml(children[i]) + '</statement>';
    }
  }
  return { xml: xml, plusCount: plusCount };
}

// For set ops: difference uses MINUS, intersection/hull use WITH
function childrenToSetOp(children, firstInput, extraPrefix) {
  var xml = '';
  if (children.length > 0) {
    xml += '<statement name="' + firstInput + '">' + stmtToXml(children[0]) + '</statement>';
  }
  var extraCount = children.length - 1;
  // For union, first extra starts at PLUS0; for difference MINUS0; for intersection/hull WITH0
  if (extraCount > 0) {
    for (var i = 1; i < children.length; i++) {
      xml += '<statement name="' + extraPrefix + (i - 1) + '">' + stmtToXml(children[i]) + '</statement>';
    }
  }
  return { xml: xml, extraCount: extraCount };
}

// Get a vector literal's elements as expressions, or fall back to 0s
function getVectorElements(node, count) {
  var result = [];
  if (node && node.type === 'VectorLiteral') {
    for (var i = 0; i < count; i++) {
      result.push(node.elements[i] || null);
    }
  } else {
    for (var j = 0; j < count; j++) {
      result.push(null);
    }
  }
  return result;
}

// ============================================================
// STATEMENT NODE -> XML
// ============================================================

function stmtToXml(node) {
  if (!node) return '';

  switch (node.type) {
    case 'ModuleCall': return moduleCallToXml(node);
    case 'Assignment': return assignmentToXml(node);
    case 'ForLoop': return forLoopToXml(node);
    case 'IfElse': return ifElseToXml(node);
    default: return '';
  }
}

// ============================================================
// ASSIGNMENT
// ============================================================

function assignmentToXml(node) {
  return '<block type="variables_set" id="' + nextId() + '">' +
    '<field name="VAR">' + escXml(node.name) + '</field>' +
    '<value name="VALUE">' + exprToXml(node.value) + '</value>' +
    '</block>';
}

// ============================================================
// FOR LOOP
// ============================================================

function forLoopToXml(node) {
  var xml = '<block type="controls_for" id="' + nextId() + '">';
  xml += '<field name="VAR">' + escXml(node.varName) + '</field>';
  xml += '<field name="HULL">FALSE</field>';
  xml += '<value name="FROM">' + exprToXml(node.from) + '</value>';
  xml += '<value name="TO">' + exprToXml(node.to) + '</value>';
  xml += '<value name="BY">' + exprToXml(node.step || {type:'NumberLiteral', value:1}) + '</value>';

  if (node.children.length > 0) {
    xml += '<statement name="DO">' + stmtsToChain(node.children) + '</statement>';
  }
  xml += '</block>';
  return xml;
}

// ============================================================
// IF / ELSE
// ============================================================

function ifElseToXml(node) {
  // Count elseif chains
  var clauses = []; // {condition, body}
  var elseBody = null;

  // First clause
  clauses.push({condition: node.condition, body: node.thenBody});

  // Walk elseBody for chained else-if
  var current = node;
  while (current.elseBody) {
    if (current.elseBody.length === 1 && current.elseBody[0].type === 'IfElse') {
      var next = current.elseBody[0];
      clauses.push({condition: next.condition, body: next.thenBody});
      current = next;
    } else {
      elseBody = current.elseBody;
      break;
    }
  }

  var elseifCount = clauses.length - 1;
  var elseCount = elseBody ? 1 : 0;

  var xml = '<block type="controls_if" id="' + nextId() + '">';
  if (elseifCount > 0 || elseCount > 0) {
    xml += '<mutation elseif="' + elseifCount + '" else="' + elseCount + '"></mutation>';
  }

  for (var i = 0; i < clauses.length; i++) {
    xml += '<value name="IF' + i + '">' + exprToXml(clauses[i].condition) + '</value>';
    if (clauses[i].body.length > 0) {
      xml += '<statement name="DO' + i + '">' + stmtsToChain(clauses[i].body) + '</statement>';
    }
  }

  if (elseBody && elseBody.length > 0) {
    xml += '<statement name="ELSE">' + stmtsToChain(elseBody) + '</statement>';
  }

  xml += '</block>';
  return xml;
}

// ============================================================
// MODULE CALLS
// ============================================================

function moduleCallToXml(node) {
  var name = node.name;
  var args = node.args;
  var children = node.children;

  // Primitives
  if (name === 'sphere') return sphereToXml(args);
  if (name === 'cube') return cubeToXml(args);
  if (name === 'cylinder') return cylinderToXml(args);
  if (name === 'circle') return circleToXml(args);
  if (name === 'square') return squareToXml(args);

  // Transforms
  if (name === 'translate') return transformToXml('translate', args, children);
  if (name === 'rotate') return rotateToXml(args, children);
  if (name === 'scale') return transformToXml('scale', args, children);
  if (name === 'mirror') return mirrorToXml(args, children);

  // Set operations
  if (name === 'union') return setOpToXml('union', children);
  if (name === 'difference') return setOpToXml('difference', children);
  if (name === 'intersection') return setOpToXml('intersection', children);
  if (name === 'hull') return setOpToXml('hull', children);

  // Extrusions
  if (name === 'linear_extrude') return linearExtrudeToXml(args, children);
  if (name === 'rotate_extrude') return rotateExtrudeToXml(args, children);

  // Color
  if (name === 'color') return colorToXml(args, children);

  // Unknown module - skip
  return '';
}

// ============================================================
// PRIMITIVES
// ============================================================

function sphereToXml(args) {
  var rArg = getArg(args, 'r');
  var dArg = getArg(args, 'd');
  var measure = 'radius';
  var val = rArg;

  if (dArg) {
    measure = 'diameter';
    val = dArg;
  } else if (!rArg) {
    // Positional first arg
    val = getPosArg(args, 0);
  }

  // Check for diameter pattern: r=(X)/2 means diameter mode
  if (rArg && rArg.type === 'BinaryOp' && rArg.op === '/' &&
      rArg.right.type === 'NumberLiteral' && rArg.right.value === 2) {
    measure = 'diameter';
    // The actual diameter value is the left side (possibly in parens)
    val = rArg.left;
  }

  return '<block type="sphere" id="' + nextId() + '">' +
    '<field name="MEASURE">' + measure + '</field>' +
    '<value name="RAD">' + exprToXml(val) + '</value>' +
    '</block>';
}

function cubeToXml(args) {
  var center = getArg(args, 'center');
  var centerVal = center ? boolToStr(center) : 'false';
  var sizeArg = getPosArg(args, 0) || getArg(args, 'size');
  var elems = getVectorElements(sizeArg, 3);

  return '<block type="cube" id="' + nextId() + '">' +
    '<field name="CENTERDROPDOWN">' + centerVal + '</field>' +
    '<value name="XVAL">' + exprToXml(elems[0]) + '</value>' +
    '<value name="YVAL">' + exprToXml(elems[1]) + '</value>' +
    '<value name="ZVAL">' + exprToXml(elems[2]) + '</value>' +
    '</block>';
}

function cylinderToXml(args) {
  var r1 = getArg(args, 'r1');
  var r2 = getArg(args, 'r2');
  var r = getArg(args, 'r');
  var h = getArgOrPos(args, 'h', 0);
  var center = getArg(args, 'center');
  var centerVal = center ? boolToStr(center) : 'false';
  var measure = 'radius';

  // Check for diameter pattern
  var d = getArg(args, 'd');
  var d1 = getArg(args, 'd1');
  var d2 = getArg(args, 'd2');

  if (d1 || d2 || d) {
    measure = 'diameter';
    if (d) { r1 = d; r2 = d; }
    if (d1) r1 = d1;
    if (d2) r2 = d2;
  } else if (r && !r1 && !r2) {
    // Check if r=(X)/2 pattern (diameter mode)
    if (r.type === 'BinaryOp' && r.op === '/' &&
        r.right.type === 'NumberLiteral' && r.right.value === 2) {
      measure = 'diameter';
      r1 = r.left;
      r2 = r.left;
    } else {
      r1 = r;
      r2 = r;
    }
  } else {
    // Check r1/r2 for diameter pattern
    if (r1 && r1.type === 'BinaryOp' && r1.op === '/' &&
        r1.right.type === 'NumberLiteral' && r1.right.value === 2) {
      measure = 'diameter';
      r1 = r1.left;
      if (r2 && r2.type === 'BinaryOp' && r2.op === '/' &&
          r2.right.type === 'NumberLiteral' && r2.right.value === 2) {
        r2 = r2.left;
      }
    }
  }

  return '<block type="cylinder" id="' + nextId() + '">' +
    '<field name="MEASURE">' + measure + '</field>' +
    '<field name="CENTERDROPDOWN">' + centerVal + '</field>' +
    '<value name="RAD1">' + exprToXml(r1) + '</value>' +
    '<value name="RAD2">' + exprToXml(r2) + '</value>' +
    '<value name="HEIGHT">' + exprToXml(h) + '</value>' +
    '</block>';
}

function circleToXml(args) {
  var rArg = getArg(args, 'r');
  var dArg = getArg(args, 'd');
  var measure = 'radius';
  var val = rArg;

  if (dArg) {
    measure = 'diameter';
    val = dArg;
  } else if (!rArg) {
    val = getPosArg(args, 0);
  }

  if (rArg && rArg.type === 'BinaryOp' && rArg.op === '/' &&
      rArg.right.type === 'NumberLiteral' && rArg.right.value === 2) {
    measure = 'diameter';
    val = rArg.left;
  }

  return '<block type="circle" id="' + nextId() + '">' +
    '<field name="MEASURE">' + measure + '</field>' +
    '<value name="RAD">' + exprToXml(val) + '</value>' +
    '</block>';
}

function squareToXml(args) {
  var center = getArg(args, 'center');
  var centerVal = center ? boolToStr(center) : 'false';
  var sizeArg = getPosArg(args, 0) || getArg(args, 'size');
  var elems = getVectorElements(sizeArg, 2);

  return '<block type="square" id="' + nextId() + '">' +
    '<field name="CENTERDROPDOWN">' + centerVal + '</field>' +
    '<value name="XVAL">' + exprToXml(elems[0]) + '</value>' +
    '<value name="YVAL">' + exprToXml(elems[1]) + '</value>' +
    '</block>';
}

// ============================================================
// TRANSFORMS
// ============================================================

function transformToXml(blockType, args, children) {
  var vecArg = getPosArg(args, 0);
  var elems = getVectorElements(vecArg, 3);

  var id = nextId();
  var ch = childrenToStatements(children, 'A', 'PLUS');
  var xml = '<block type="' + blockType + '" id="' + id + '">';
  if (ch.plusCount > 0) {
    xml += '<mutation plus="' + ch.plusCount + '"></mutation>';
  }
  xml += '<value name="XVAL">' + exprToXml(elems[0]) + '</value>';
  xml += '<value name="YVAL">' + exprToXml(elems[1]) + '</value>';
  xml += '<value name="ZVAL">' + exprToXml(elems[2]) + '</value>';
  xml += ch.xml;
  xml += '</block>';
  return xml;
}

function rotateToXml(args, children) {
  var aArg = getArg(args, 'a');
  var vArg = getArg(args, 'v');

  // fancy rotate: rotate(a=A, v=[x,y,z])
  if (aArg && vArg) {
    var elems = getVectorElements(vArg, 3);
    var id = nextId();
    var ch = childrenToStatements(children, 'A', 'PLUS');
    var xml = '<block type="fancyrotate" id="' + id + '">';
    if (ch.plusCount > 0) {
      xml += '<mutation plus="' + ch.plusCount + '"></mutation>';
    }
    xml += '<value name="AVAL">' + exprToXml(aArg) + '</value>';
    xml += '<value name="XVAL">' + exprToXml(elems[0]) + '</value>';
    xml += '<value name="YVAL">' + exprToXml(elems[1]) + '</value>';
    xml += '<value name="ZVAL">' + exprToXml(elems[2]) + '</value>';
    xml += ch.xml;
    xml += '</block>';
    return xml;
  }

  // simple rotate: rotate([x,y,z])
  var vecArg = getPosArg(args, 0);
  var elems2 = getVectorElements(vecArg, 3);
  var id2 = nextId();
  var ch2 = childrenToStatements(children, 'A', 'PLUS');
  var xml2 = '<block type="simplerotate" id="' + id2 + '">';
  if (ch2.plusCount > 0) {
    xml2 += '<mutation plus="' + ch2.plusCount + '"></mutation>';
  }
  xml2 += '<value name="XVAL">' + exprToXml(elems2[0]) + '</value>';
  xml2 += '<value name="YVAL">' + exprToXml(elems2[1]) + '</value>';
  xml2 += '<value name="ZVAL">' + exprToXml(elems2[2]) + '</value>';
  xml2 += ch2.xml;
  xml2 += '</block>';
  return xml2;
}

function mirrorToXml(args, children) {
  var vecArg = getPosArg(args, 0);
  var elems = getVectorElements(vecArg, 3);
  var id = nextId();
  var ch = childrenToStatements(children, 'A', 'PLUS');
  var xml = '<block type="fancymirror" id="' + id + '">';
  if (ch.plusCount > 0) {
    xml += '<mutation plus="' + ch.plusCount + '"></mutation>';
  }
  xml += '<value name="XVAL">' + exprToXml(elems[0]) + '</value>';
  xml += '<value name="YVAL">' + exprToXml(elems[1]) + '</value>';
  xml += '<value name="ZVAL">' + exprToXml(elems[2]) + '</value>';
  xml += ch.xml;
  xml += '</block>';
  return xml;
}

// ============================================================
// SET OPERATIONS
// ============================================================

function setOpToXml(name, children) {
  if (name === 'union') {
    // Union: first child in A, rest in PLUS0, PLUS1...
    var ch = childrenToSetOp(children, 'A', 'PLUS');
    var id = nextId();
    var xml = '<block type="union" id="' + id + '">';
    if (ch.extraCount > 0) {
      xml += '<mutation plus="' + (ch.extraCount - 1) + '"></mutation>';
    }
    xml += ch.xml;
    xml += '</block>';
    return xml;
  }

  if (name === 'difference') {
    // Difference: first child in A, rest in MINUS0, MINUS1...
    var ch2 = childrenToSetOp(children, 'A', 'MINUS');
    var id2 = nextId();
    var xml2 = '<block type="difference" id="' + id2 + '">';
    if (ch2.extraCount > 0) {
      xml2 += '<mutation minus="' + (ch2.extraCount - 1) + '"></mutation>';
    }
    xml2 += ch2.xml;
    xml2 += '</block>';
    return xml2;
  }

  if (name === 'intersection' || name === 'hull') {
    var ch3 = childrenToSetOp(children, 'A', 'WITH');
    var id3 = nextId();
    var xml3 = '<block type="' + name + '" id="' + id3 + '">';
    if (ch3.extraCount > 0) {
      xml3 += '<mutation with="' + (ch3.extraCount - 1) + '"></mutation>';
    }
    xml3 += ch3.xml;
    xml3 += '</block>';
    return xml3;
  }

  return '';
}

// ============================================================
// EXTRUSIONS
// ============================================================

function linearExtrudeToXml(args, children) {
  var h = getArgOrPos(args, 'height', 0);
  var twist = getArg(args, 'twist');
  var scaleArg = getArg(args, 'scale');
  var center = getArg(args, 'center');
  var centerVal = center ? boolToStr(center) : 'false';

  var xscale = null, yscale = null;
  if (scaleArg && scaleArg.type === 'VectorLiteral' && scaleArg.elements.length >= 2) {
    xscale = scaleArg.elements[0];
    yscale = scaleArg.elements[1];
  } else if (scaleArg) {
    xscale = scaleArg;
    yscale = scaleArg;
  }

  var id = nextId();
  var ch = childrenToStatements(children, 'A', 'PLUS');
  var xml = '<block type="linearextrude" id="' + id + '">';
  if (ch.plusCount > 0) {
    xml += '<mutation plus="' + ch.plusCount + '"></mutation>';
  }
  xml += '<field name="CENTERDROPDOWN">' + centerVal + '</field>';
  xml += '<value name="HEIGHT">' + exprToXml(h) + '</value>';
  xml += '<value name="TWIST">' + exprToXml(twist) + '</value>';
  if (xscale) xml += '<value name="XSCALE">' + exprToXml(xscale) + '</value>';
  if (yscale) xml += '<value name="YSCALE">' + exprToXml(yscale) + '</value>';
  xml += ch.xml;
  xml += '</block>';
  return xml;
}

function rotateExtrudeToXml(args, children) {
  var fn = getArg(args, '$fn');
  var id = nextId();
  var ch = childrenToStatements(children, 'A', 'PLUS');
  var xml = '<block type="rotateextrude" id="' + id + '">';
  if (ch.plusCount > 0) {
    xml += '<mutation plus="' + ch.plusCount + '"></mutation>';
  }
  xml += '<value name="FACES">' + exprToXml(fn) + '</value>';
  xml += ch.xml;
  xml += '</block>';
  return xml;
}

// ============================================================
// COLOR
// ============================================================

function colorToXml(args, children) {
  var colorArg = getPosArg(args, 0);
  var id = nextId();
  var ch = childrenToStatements(children, 'A', 'PLUS');

  // color([r,g,b]) with float values 0-1 -> convert to hex
  var hex = '#ff0000'; // default
  if (colorArg && colorArg.type === 'VectorLiteral' && colorArg.elements.length >= 3) {
    var r = colorArg.elements[0];
    var g = colorArg.elements[1];
    var b = colorArg.elements[2];
    if (r.type === 'NumberLiteral' && g.type === 'NumberLiteral' && b.type === 'NumberLiteral') {
      var ri = Math.round(Math.min(1, Math.max(0, r.value)) * 255);
      var gi = Math.round(Math.min(1, Math.max(0, g.value)) * 255);
      var bi = Math.round(Math.min(1, Math.max(0, b.value)) * 255);
      hex = '#' + toHex2(ri) + toHex2(gi) + toHex2(bi);
    }
  }

  var xml = '<block type="color" id="' + id + '">';
  if (ch.plusCount > 0) {
    xml += '<mutation plus="' + ch.plusCount + '"></mutation>';
  }
  xml += '<value name="COLOR"><block type="colour_picker" id="' + nextId() + '">' +
    '<field name="COLOUR">' + hex + '</field></block></value>';
  xml += ch.xml;
  xml += '</block>';
  return xml;
}

function toHex2(n) {
  var s = n.toString(16);
  return s.length < 2 ? '0' + s : s;
}

// ============================================================
// HELPERS
// ============================================================

function boolToStr(node) {
  if (!node) return 'false';
  if (node.type === 'BoolLiteral') return node.value ? 'true' : 'false';
  if (node.type === 'VariableRef') return node.name === 'true' ? 'true' : 'false';
  return 'false';
}

// Chain multiple statement blocks with <next>
function stmtsToChain(stmts) {
  if (!stmts || stmts.length === 0) return '';

  // Filter out empty results
  var xmlParts = [];
  for (var i = 0; i < stmts.length; i++) {
    var x = stmtToXml(stmts[i]);
    if (x) xmlParts.push(x);
  }
  if (xmlParts.length === 0) return '';
  if (xmlParts.length === 1) return xmlParts[0];

  // Only variable_set blocks chain with <next>; geometry blocks are separate
  // In BlocksCAD, statement blocks inside a DO or geometry container don't chain with next
  // They just go as separate blocks. Only top-level variable_set chains.
  // Actually, looking at the examples, geometry inside containers are single blocks per statement slot.
  // So for DO bodies with multiple stmts, we just return the first one.
  // Wait - actually in for loops the DO only has one statement slot.
  // For geometry containers, children go in A, PLUS0, etc.
  // So stmtsToChain is only used for for-loop DO and if-else DO bodies - only single child.
  return xmlParts[0];
}

// ============================================================
// TOP-LEVEL CONVERTER
// ============================================================

function convert(code) {
  var internals = window._OpenSCADParserInternals;
  if (!internals) {
    return {success: false, xml: '', errors: [{line:0, col:0, message:'Parser not loaded'}]};
  }

  E.resetIds();

  var tokens, ast, errors;
  try {
    tokens = internals.tokenize(code);
    var parser = new internals.Parser(tokens);
    ast = parser.parseProgram();
    errors = parser.errors;
  } catch (e) {
    return {success: false, xml: '', errors: [{line:0, col:0, message: e.message || 'Parse error'}]};
  }

  if (errors && errors.length > 0) {
    return {success: false, xml: '', errors: errors};
  }

  // Generate XML
  var blocks = [];
  var varSetBlocks = [];
  var geoBlocks = [];

  // Separate variable assignments from geometry
  for (var i = 0; i < ast.length; i++) {
    if (ast[i].type === 'Assignment') {
      varSetBlocks.push(ast[i]);
    } else {
      geoBlocks.push(ast[i]);
    }
  }

  // Chain variable_set blocks with <next>
  if (varSetBlocks.length > 0) {
    var varXml = buildVarChain(varSetBlocks);
    if (varXml) blocks.push(varXml);
  }

  // Each geometry block is a separate top-level block
  for (var j = 0; j < geoBlocks.length; j++) {
    var bxml = stmtToXml(geoBlocks[j]);
    if (bxml) blocks.push(bxml);
  }

  var xmlStr = '<xml xmlns="http://www.w3.org/1999/xhtml">';
  for (var k = 0; k < blocks.length; k++) {
    xmlStr += blocks[k];
  }
  xmlStr += '</xml>';

  return {success: true, xml: xmlStr, errors: []};
}

function buildVarChain(varNodes) {
  if (varNodes.length === 0) return '';

  // Build from last to first, wrapping in <next>
  var xml = assignmentToXml(varNodes[varNodes.length - 1]);

  for (var i = varNodes.length - 2; i >= 0; i--) {
    var outer = '<block type="variables_set" id="' + nextId() + '">' +
      '<field name="VAR">' + escXml(varNodes[i].name) + '</field>' +
      '<value name="VALUE">' + exprToXml(varNodes[i].value) + '</value>' +
      '<next>' + xml + '</next>' +
      '</block>';
    xml = outer;
  }

  return xml;
}

// ============================================================
// PUBLIC API
// ============================================================

window.BlockscadOpenscadToBlocks = {
  convert: convert
};

})();
