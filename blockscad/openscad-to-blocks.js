/**
 * OpenSCAD to Blockly XML Converter for BlocksCAD
 * Converts a BlocksCAD-subset of OpenSCAD code into Blockly workspace XML.
 *
 * Three stages: Tokenizer -> Parser (AST) -> XML Generator
 */

(function() {
'use strict';

// ============================================================
// TOKENIZER
// ============================================================

var TokenType = {
  NUMBER: 'NUMBER', STRING: 'STRING', IDENTIFIER: 'IDENTIFIER',
  LPAREN: 'LPAREN', RPAREN: 'RPAREN', LBRACE: 'LBRACE', RBRACE: 'RBRACE',
  LBRACKET: 'LBRACKET', RBRACKET: 'RBRACKET',
  SEMICOLON: 'SEMICOLON', COMMA: 'COMMA', EQUALS: 'EQUALS',
  PLUS: 'PLUS', MINUS: 'MINUS', STAR: 'STAR', SLASH: 'SLASH', PERCENT: 'PERCENT',
  LT: 'LT', GT: 'GT', LTE: 'LTE', GTE: 'GTE', EQEQ: 'EQEQ', NEQ: 'NEQ',
  AND: 'AND', OR: 'OR', NOT: 'NOT',
  QUESTION: 'QUESTION', COLON: 'COLON', DOT: 'DOT',
  EOF: 'EOF'
};

function Token(type, value, line, col) {
  this.type = type;
  this.value = value;
  this.line = line;
  this.col = col;
}

function tokenize(source) {
  var tokens = [];
  var i = 0, line = 1, col = 1;
  var len = source.length;

  while (i < len) {
    var ch = source[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; col++; continue; }
    if (ch === '\n') { i++; line++; col = 1; continue; }

    // Line comment
    if (ch === '/' && i + 1 < len && source[i + 1] === '/') {
      while (i < len && source[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (ch === '/' && i + 1 < len && source[i + 1] === '*') {
      i += 2; col += 2;
      while (i < len) {
        if (source[i] === '*' && i + 1 < len && source[i + 1] === '/') { i += 2; col += 2; break; }
        if (source[i] === '\n') { line++; col = 1; } else { col++; }
        i++;
      }
      continue;
    }

    var startCol = col;

    // Number
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < len && source[i + 1] >= '0' && source[i + 1] <= '9')) {
      var numStr = '';
      if (ch === '0' && i + 1 < len && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        numStr = '0x'; i += 2; col += 2;
        while (i < len && /[0-9a-fA-F]/.test(source[i])) { numStr += source[i]; i++; col++; }
      } else {
        while (i < len && ((source[i] >= '0' && source[i] <= '9') || source[i] === '.')) { numStr += source[i]; i++; col++; }
        if (i < len && (source[i] === 'e' || source[i] === 'E')) {
          numStr += source[i]; i++; col++;
          if (i < len && (source[i] === '+' || source[i] === '-')) { numStr += source[i]; i++; col++; }
          while (i < len && source[i] >= '0' && source[i] <= '9') { numStr += source[i]; i++; col++; }
        }
      }
      tokens.push(new Token(TokenType.NUMBER, numStr, line, startCol));
      continue;
    }

    // String
    if (ch === '"') {
      var str = ''; i++; col++;
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < len) { str += source[i] + source[i + 1]; i += 2; col += 2; }
        else { str += source[i]; i++; col++; }
      }
      if (i < len) { i++; col++; } // skip closing quote
      tokens.push(new Token(TokenType.STRING, str, line, startCol));
      continue;
    }

    // Identifier or keyword (including $-prefixed)
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$') {
      var ident = '';
      while (i < len && ((source[i] >= 'a' && source[i] <= 'z') || (source[i] >= 'A' && source[i] <= 'Z') ||
             (source[i] >= '0' && source[i] <= '9') || source[i] === '_' || source[i] === '$')) {
        ident += source[i]; i++; col++;
      }
      tokens.push(new Token(TokenType.IDENTIFIER, ident, line, startCol));
      continue;
    }

    // Two-char operators
    if (i + 1 < len) {
      var two = ch + source[i + 1];
      if (two === '==') { tokens.push(new Token(TokenType.EQEQ, '==', line, startCol)); i += 2; col += 2; continue; }
      if (two === '!=') { tokens.push(new Token(TokenType.NEQ, '!=', line, startCol)); i += 2; col += 2; continue; }
      if (two === '<=') { tokens.push(new Token(TokenType.LTE, '<=', line, startCol)); i += 2; col += 2; continue; }
      if (two === '>=') { tokens.push(new Token(TokenType.GTE, '>=', line, startCol)); i += 2; col += 2; continue; }
      if (two === '&&') { tokens.push(new Token(TokenType.AND, '&&', line, startCol)); i += 2; col += 2; continue; }
      if (two === '||') { tokens.push(new Token(TokenType.OR, '||', line, startCol)); i += 2; col += 2; continue; }
    }

    // Single-char tokens
    var singleMap = {
      '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '{': TokenType.LBRACE, '}': TokenType.RBRACE,
      '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
      ';': TokenType.SEMICOLON, ',': TokenType.COMMA,
      '=': TokenType.EQUALS, '+': TokenType.PLUS, '-': TokenType.MINUS,
      '*': TokenType.STAR, '/': TokenType.SLASH, '%': TokenType.PERCENT,
      '<': TokenType.LT, '>': TokenType.GT,
      '!': TokenType.NOT, '?': TokenType.QUESTION, ':': TokenType.COLON,
      '.': TokenType.DOT
    };
    if (singleMap[ch]) {
      tokens.push(new Token(singleMap[ch], ch, line, startCol));
      i++; col++; continue;
    }

    // Unknown character - skip
    i++; col++;
  }

  tokens.push(new Token(TokenType.EOF, '', line, col));
  return tokens;
}

// ============================================================
// PARSER - Recursive Descent -> AST
// ============================================================

// AST node constructors
function NumberLiteral(value, line) { this.type = 'NumberLiteral'; this.value = value; this.line = line; }
function StringLiteral(value, line) { this.type = 'StringLiteral'; this.value = value; this.line = line; }
function BoolLiteral(value, line) { this.type = 'BoolLiteral'; this.value = value; this.line = line; }
function VectorLiteral(elements, line) { this.type = 'VectorLiteral'; this.elements = elements; this.line = line; }
function VariableRef(name, line) { this.type = 'VariableRef'; this.name = name; this.line = line; }
function UnaryOp(op, operand, line) { this.type = 'UnaryOp'; this.op = op; this.operand = operand; this.line = line; }
function BinaryOp(op, left, right, line) { this.type = 'BinaryOp'; this.op = op; this.left = left; this.right = right; this.line = line; }
function TernaryOp(cond, thenExpr, elseExpr, line) { this.type = 'TernaryOp'; this.cond = cond; this.thenExpr = thenExpr; this.elseExpr = elseExpr; this.line = line; }
function FunctionCall(name, args, line) { this.type = 'FunctionCall'; this.name = name; this.args = args; this.line = line; }
function Assignment(name, value, line) { this.type = 'Assignment'; this.name = name; this.value = value; this.line = line; }
function ModuleCall(name, args, children, line) { this.type = 'ModuleCall'; this.name = name; this.args = args; this.children = children; this.line = line; }
function ForLoop(varName, from, step, to, children, line) { this.type = 'ForLoop'; this.varName = varName; this.from = from; this.step = step; this.to = to; this.children = children; this.line = line; }
function IfElse(condition, thenBody, elseBody, line) { this.type = 'IfElse'; this.condition = condition; this.thenBody = thenBody; this.elseBody = elseBody; this.line = line; }
function NamedArg(name, value) { this.type = 'NamedArg'; this.name = name; this.value = value; }
function RangeExpr(from, step, to, line) { this.type = 'RangeExpr'; this.from = from; this.step = step; this.to = to; this.line = line; }

function Parser(tokens) {
  this.tokens = tokens;
  this.pos = 0;
  this.errors = [];
}

Parser.prototype.peek = function() { return this.tokens[this.pos]; };
Parser.prototype.advance = function() { return this.tokens[this.pos++]; };
Parser.prototype.isAtEnd = function() { return this.peek().type === TokenType.EOF; };

Parser.prototype.check = function(type) { return this.peek().type === type; };

Parser.prototype.match = function(type) {
  if (this.check(type)) { this.advance(); return true; }
  return false;
};

Parser.prototype.expect = function(type, msg) {
  if (this.check(type)) return this.advance();
  var t = this.peek();
  this.errors.push({line: t.line, col: t.col, message: msg || ('Expected ' + type + ' but got ' + t.type)});
  return t;
};

Parser.prototype.error = function(msg, token) {
  var t = token || this.peek();
  this.errors.push({line: t.line, col: t.col, message: msg});
};

Parser.prototype.parseProgram = function() {
  var stmts = [];
  while (!this.isAtEnd()) {
    try {
      var s = this.parseStatement();
      if (s) stmts.push(s);
    } catch (e) {
      this.error(e.message || 'Parse error');
      this.advance(); // skip problematic token
    }
  }
  return stmts;
};

Parser.prototype.parseStatement = function() {
  var t = this.peek();

  if (t.type === TokenType.IDENTIFIER && t.value === 'for') return this.parseForLoop();
  if (t.type === TokenType.IDENTIFIER && t.value === 'if') return this.parseIfElse();

  // Check for assignment: IDENT = expr ;
  if (t.type === TokenType.IDENTIFIER && this.pos + 1 < this.tokens.length &&
      this.tokens[this.pos + 1].type === TokenType.EQUALS &&
      this.tokens[this.pos + 1].value === '=' &&
      // Make sure it's not ==
      (this.pos + 2 >= this.tokens.length || this.tokens[this.pos + 2].type !== TokenType.EQUALS)) {
    return this.parseAssignment();
  }

  // Module call: IDENT ( ... ) { ... } or IDENT ( ... ) ;
  if (t.type === TokenType.IDENTIFIER) {
    return this.parseModuleCallOrExprStmt();
  }

  // Skip semicolons
  if (t.type === TokenType.SEMICOLON) { this.advance(); return null; }

  this.error('Unexpected token: ' + t.value, t);
  this.advance();
  return null;
};

Parser.prototype.parseAssignment = function() {
  var nameToken = this.advance();
  this.expect(TokenType.EQUALS, 'Expected "="');
  var value = this.parseExpression();
  this.expect(TokenType.SEMICOLON, 'Expected ";" after assignment');
  return new Assignment(nameToken.value, value, nameToken.line);
};

Parser.prototype.parseModuleCallOrExprStmt = function() {
  var nameToken = this.advance();
  var name = nameToken.value;

  // Reject unsupported constructs
  if (name === 'module' || name === 'function') {
    this.error('BlocksCAD does not support "' + name + '" definitions. Use blocks instead.', nameToken);
    // Skip until matching brace or semicolon
    var depth = 0;
    while (!this.isAtEnd()) {
      if (this.check(TokenType.LBRACE)) { depth++; this.advance(); }
      else if (this.check(TokenType.RBRACE)) { depth--; this.advance(); if (depth <= 0) break; }
      else if (depth === 0 && this.check(TokenType.SEMICOLON)) { this.advance(); break; }
      else this.advance();
    }
    return null;
  }

  if (name === 'include' || name === 'use') {
    this.error('"' + name + '" is not supported in BlocksCAD.', nameToken);
    while (!this.isAtEnd() && !this.check(TokenType.SEMICOLON)) this.advance();
    if (this.check(TokenType.SEMICOLON)) this.advance();
    return null;
  }

  this.expect(TokenType.LPAREN, 'Expected "(" after module name');
  var args = this.parseArgList();
  this.expect(TokenType.RPAREN, 'Expected ")"');

  var children = [];
  if (this.match(TokenType.LBRACE)) {
    children = this.parseBlock();
  } else {
    this.match(TokenType.SEMICOLON);
  }

  return new ModuleCall(name, args, children, nameToken.line);
};

Parser.prototype.parseArgList = function() {
  var args = [];
  if (this.check(TokenType.RPAREN)) return args;

  do {
    // Check for named arg: IDENT = expr
    if (this.peek().type === TokenType.IDENTIFIER && this.pos + 1 < this.tokens.length &&
        this.tokens[this.pos + 1].type === TokenType.EQUALS) {
      var name = this.advance().value;
      this.advance(); // skip =
      var val = this.parseExpression();
      args.push(new NamedArg(name, val));
    } else {
      args.push(this.parseExpression());
    }
  } while (this.match(TokenType.COMMA));

  return args;
};

Parser.prototype.parseBlock = function() {
  var stmts = [];
  while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
    var s = this.parseStatement();
    if (s) stmts.push(s);
  }
  this.expect(TokenType.RBRACE, 'Expected "}"');
  return stmts;
};

Parser.prototype.parseForLoop = function() {
  var t = this.advance(); // consume 'for'
  this.expect(TokenType.LPAREN, 'Expected "(" after "for"');
  var varName = this.expect(TokenType.IDENTIFIER, 'Expected variable name').value;
  this.expect(TokenType.EQUALS, 'Expected "="');
  this.expect(TokenType.LBRACKET, 'Expected "["');

  var from = this.parseExpression();
  this.expect(TokenType.COLON, 'Expected ":"');
  var secondExpr = this.parseExpression();
  var step = null, to;

  if (this.match(TokenType.COLON)) {
    step = secondExpr;
    to = this.parseExpression();
  } else {
    to = secondExpr;
  }

  this.expect(TokenType.RBRACKET, 'Expected "]"');
  this.expect(TokenType.RPAREN, 'Expected ")"');
  this.expect(TokenType.LBRACE, 'Expected "{"');
  var children = this.parseBlock();

  return new ForLoop(varName, from, step, to, children, t.line);
};

Parser.prototype.parseIfElse = function() {
  var t = this.advance(); // consume 'if'
  this.expect(TokenType.LPAREN, 'Expected "("');
  var cond = this.parseExpression();
  this.expect(TokenType.RPAREN, 'Expected ")"');
  this.expect(TokenType.LBRACE, 'Expected "{"');
  var thenBody = this.parseBlock();

  var elseBody = null;
  if (this.peek().type === TokenType.IDENTIFIER && this.peek().value === 'else') {
    this.advance();
    if (this.peek().type === TokenType.IDENTIFIER && this.peek().value === 'if') {
      elseBody = [this.parseIfElse()];
    } else {
      this.expect(TokenType.LBRACE, 'Expected "{"');
      elseBody = this.parseBlock();
    }
  }

  return new IfElse(cond, thenBody, elseBody, t.line);
};

// Expression parsing with precedence
Parser.prototype.parseExpression = function() { return this.parseTernary(); };

Parser.prototype.parseTernary = function() {
  var expr = this.parseOr();
  if (this.match(TokenType.QUESTION)) {
    var thenE = this.parseExpression();
    this.expect(TokenType.COLON, 'Expected ":" in ternary');
    var elseE = this.parseExpression();
    return new TernaryOp(expr, thenE, elseE, expr.line);
  }
  return expr;
};

Parser.prototype.parseOr = function() {
  var left = this.parseAnd();
  while (this.match(TokenType.OR)) { left = new BinaryOp('||', left, this.parseAnd(), left.line); }
  return left;
};

Parser.prototype.parseAnd = function() {
  var left = this.parseComparison();
  while (this.match(TokenType.AND)) { left = new BinaryOp('&&', left, this.parseComparison(), left.line); }
  return left;
};

Parser.prototype.parseComparison = function() {
  var left = this.parseAddition();
  var ops = [TokenType.EQEQ, TokenType.NEQ, TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE];
  while (ops.indexOf(this.peek().type) !== -1) {
    var op = this.advance().value;
    left = new BinaryOp(op, left, this.parseAddition(), left.line);
  }
  return left;
};

Parser.prototype.parseAddition = function() {
  var left = this.parseMultiplication();
  while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
    var op = this.advance().value;
    left = new BinaryOp(op, left, this.parseMultiplication(), left.line);
  }
  return left;
};

Parser.prototype.parseMultiplication = function() {
  var left = this.parseUnary();
  while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.PERCENT)) {
    var op = this.advance().value;
    left = new BinaryOp(op, left, this.parseUnary(), left.line);
  }
  return left;
};

Parser.prototype.parseUnary = function() {
  if (this.match(TokenType.MINUS)) return new UnaryOp('-', this.parseUnary(), this.tokens[this.pos - 1].line);
  if (this.match(TokenType.NOT)) return new UnaryOp('!', this.parseUnary(), this.tokens[this.pos - 1].line);
  return this.parsePrimary();
};

Parser.prototype.parsePrimary = function() {
  var t = this.peek();

  // Number
  if (t.type === TokenType.NUMBER) {
    this.advance();
    return new NumberLiteral(parseFloat(t.value), t.line);
  }

  // String
  if (t.type === TokenType.STRING) {
    this.advance();
    return new StringLiteral(t.value, t.line);
  }

  // Vector literal [expr, expr, ...] or range [from:step:to]
  if (t.type === TokenType.LBRACKET) {
    this.advance();
    if (this.check(TokenType.RBRACKET)) { this.advance(); return new VectorLiteral([], t.line); }
    var first = this.parseExpression();
    if (this.match(TokenType.COLON)) {
      var second = this.parseExpression();
      if (this.match(TokenType.COLON)) {
        var third = this.parseExpression();
        this.expect(TokenType.RBRACKET, 'Expected "]"');
        return new RangeExpr(first, second, third, t.line);
      }
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      return new RangeExpr(first, null, second, t.line);
    }
    var elements = [first];
    while (this.match(TokenType.COMMA)) {
      if (this.check(TokenType.RBRACKET)) break;
      elements.push(this.parseExpression());
    }
    this.expect(TokenType.RBRACKET, 'Expected "]"');
    return new VectorLiteral(elements, t.line);
  }

  // Grouped expression
  if (t.type === TokenType.LPAREN) {
    this.advance();
    var expr = this.parseExpression();
    this.expect(TokenType.RPAREN, 'Expected ")"');
    return expr;
  }

  // Identifier, function call, bool
  if (t.type === TokenType.IDENTIFIER) {
    if (t.value === 'true') { this.advance(); return new BoolLiteral(true, t.line); }
    if (t.value === 'false') { this.advance(); return new BoolLiteral(false, t.line); }

    this.advance();
    // Function call
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      var args = [];
      if (!this.check(TokenType.RPAREN)) {
        do {
          if (this.peek().type === TokenType.IDENTIFIER && this.pos + 1 < this.tokens.length &&
              this.tokens[this.pos + 1].type === TokenType.EQUALS) {
            var argName = this.advance().value;
            this.advance();
            args.push(new NamedArg(argName, this.parseExpression()));
          } else {
            args.push(this.parseExpression());
          }
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN, 'Expected ")"');
      // Check for vector index [n]
      if (this.check(TokenType.LBRACKET)) {
        this.advance();
        var idx = this.parseExpression();
        this.expect(TokenType.RBRACKET, 'Expected "]"');
        // Wrap as index access - treat as function call result with index
        return new FunctionCall(t.value, args, t.line);
      }
      return new FunctionCall(t.value, args, t.line);
    }
    return new VariableRef(t.value, t.line);
  }

  this.error('Unexpected token: ' + t.value, t);
  this.advance();
  return new NumberLiteral(0, t.line);
};

// Expose parser classes for the XML generator
window._OpenSCADParserInternals = {
  tokenize: tokenize,
  Parser: Parser,
  TokenType: TokenType
};

})();
