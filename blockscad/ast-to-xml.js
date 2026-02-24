/**
 * AST to Blockly XML Generator for BlocksCAD
 * Converts parsed OpenSCAD AST nodes into Blockly workspace XML.
 */

(function() {
'use strict';

var idCounter = 1;
function nextId() { return '' + (idCounter++); }
function resetIds() { idCounter = 1; }

function escXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Helper: wrap a value in a math_number block
function numBlock(val) {
  return '<block type="math_number" id="' + nextId() + '"><field name="NUM">' + escXml(val) + '</field></block>';
}

// Helper: get named arg value by name from args array
function getArg(args, name) {
  for (var i = 0; i < args.length; i++) {
    if (args[i].type === 'NamedArg' && args[i].name === name) return args[i].value;
  }
  return null;
}

// Helper: get positional arg (skip NamedArgs)
function getPosArg(args, index) {
  var pos = 0;
  for (var i = 0; i < args.length; i++) {
    if (args[i].type !== 'NamedArg') {
      if (pos === index) return args[i];
      pos++;
    }
  }
  return null;
}

// Helper: get arg by name or positional index
function getArgOrPos(args, name, posIndex) {
  var named = getArg(args, name);
  if (named) return named;
  return getPosArg(args, posIndex);
}

// ============================================================
// EXPRESSION NODES -> XML
// ============================================================

function exprToXml(node) {
  if (!node) return numBlock(0);

  switch (node.type) {
    case 'NumberLiteral':
      return numBlock(node.value);

    case 'BoolLiteral':
      return '<block type="logic_boolean" id="' + nextId() + '"><field name="BOOL">' +
        (node.value ? 'TRUE' : 'FALSE') + '</field></block>';

    case 'StringLiteral':
      return '<block type="text" id="' + nextId() + '"><field name="TEXT">' +
        escXml(node.value) + '</field></block>';

    case 'VariableRef':
      return '<block type="variables_get" id="' + nextId() + '"><field name="VAR">' +
        escXml(node.name) + '</field></block>';

    case 'UnaryOp':
      return unaryToXml(node);

    case 'BinaryOp':
      return binaryToXml(node);

    case 'TernaryOp':
      return '<block type="logic_ternary" id="' + nextId() + '">' +
        '<value name="IF">' + exprToXml(node.cond) + '</value>' +
        '<value name="THEN">' + exprToXml(node.thenExpr) + '</value>' +
        '<value name="ELSE">' + exprToXml(node.elseExpr) + '</value>' +
        '</block>';

    case 'FunctionCall':
      return funcCallToXml(node);

    case 'VectorLiteral':
      // Vectors in expressions are handled contextually by callers
      return numBlock(0);

    default:
      return numBlock(0);
  }
}

function unaryToXml(node) {
  if (node.op === '-') {
    // Negate: use math_arithmetic with 0 - x, or math_single NEG
    return '<block type="math_arithmetic" id="' + nextId() + '">' +
      '<field name="OP">MINUS</field>' +
      '<value name="A">' + numBlock(0) + '</value>' +
      '<value name="B">' + exprToXml(node.operand) + '</value>' +
      '</block>';
  }
  if (node.op === '!') {
    return '<block type="logic_negate" id="' + nextId() + '">' +
      '<value name="BOOL">' + exprToXml(node.operand) + '</value>' +
      '</block>';
  }
  return numBlock(0);
}

function binaryToXml(node) {
  // Arithmetic
  var arithOps = {'+':'ADD', '-':'MINUS', '*':'MULTIPLY', '/':'DIVIDE', '%':'MODULO'};
  if (arithOps[node.op]) {
    return '<block type="math_arithmetic" id="' + nextId() + '">' +
      '<field name="OP">' + arithOps[node.op] + '</field>' +
      '<value name="A">' + exprToXml(node.left) + '</value>' +
      '<value name="B">' + exprToXml(node.right) + '</value>' +
      '</block>';
  }

  // Comparison
  var cmpOps = {'==':'EQ', '!=':'NEQ', '<':'LT', '<=':'LTE', '>':'GT', '>=':'GTE'};
  if (cmpOps[node.op]) {
    return '<block type="logic_compare" id="' + nextId() + '">' +
      '<field name="OP">' + cmpOps[node.op] + '</field>' +
      '<value name="A">' + exprToXml(node.left) + '</value>' +
      '<value name="B">' + exprToXml(node.right) + '</value>' +
      '</block>';
  }

  // Logical
  if (node.op === '&&' || node.op === '||') {
    return '<block type="logic_operation" id="' + nextId() + '">' +
      '<field name="OP">' + (node.op === '&&' ? 'AND' : 'OR') + '</field>' +
      '<value name="A">' + exprToXml(node.left) + '</value>' +
      '<value name="B">' + exprToXml(node.right) + '</value>' +
      '</block>';
  }

  return numBlock(0);
}

// Map OpenSCAD function names to Blockly math_single/math_round ops
var mathSingleMap = {
  'sin':'SIN', 'cos':'COS', 'tan':'TAN',
  'asin':'ASIN', 'acos':'ACOS', 'atan':'ATAN',
  'abs':'ABS', 'sqrt':'ROOT', 'ln':'LN', 'exp':'EXP', 'log':'LOG10'
};
var mathRoundMap = {
  'round':'ROUND', 'ceil':'ROUNDUP', 'floor':'ROUNDDOWN'
};

function funcCallToXml(node) {
  var name = node.name;
  var args = node.args;

  // pow(a, b) -> math_arithmetic POWER
  if (name === 'pow' && args.length >= 2) {
    return '<block type="math_arithmetic" id="' + nextId() + '">' +
      '<field name="OP">POWER</field>' +
      '<value name="A">' + exprToXml(args[0]) + '</value>' +
      '<value name="B">' + exprToXml(args[1]) + '</value>' +
      '</block>';
  }

  // math_single functions
  if (mathSingleMap[name] && args.length >= 1) {
    var arg = args[0].type === 'NamedArg' ? args[0].value : args[0];
    return '<block type="math_single" id="' + nextId() + '">' +
      '<field name="OP">' + mathSingleMap[name] + '</field>' +
      '<value name="NUM">' + exprToXml(arg) + '</value>' +
      '</block>';
  }

  // math_round functions
  if (mathRoundMap[name] && args.length >= 1) {
    var arg2 = args[0].type === 'NamedArg' ? args[0].value : args[0];
    return '<block type="math_round" id="' + nextId() + '">' +
      '<field name="OP">' + mathRoundMap[name] + '</field>' +
      '<value name="NUM">' + exprToXml(arg2) + '</value>' +
      '</block>';
  }

  // Unknown function - return 0
  return numBlock(0);
}

// Expose for second file
window._ASTtoXMLExpressions = {
  exprToXml: exprToXml,
  numBlock: numBlock,
  escXml: escXml,
  nextId: nextId,
  resetIds: resetIds,
  getArg: getArg,
  getPosArg: getPosArg,
  getArgOrPos: getArgOrPos
};

})();
