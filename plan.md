# Bidirectional OpenSCAD Code Editor - Implementation Progress

## Status: Phases 1-4 implemented, Phase 5 (polish) and CM6 bundling remain

---

## Completed

### Phase 1: CodeMirror 6 Integration
- [x] `blockscad/codemirror-setup.js` — Created. Initializes CodeMirror 6 editor with:
  - OpenSCAD syntax highlighting (stream parser with keywords/builtins)
  - Light and dark theme support (matches existing dark mode)
  - Global `BlockscadEditor` object with `getValue()`, `setValue()`, `onchange()`, `isDirty()`, `markClean()`, `updateTheme()`, `showError()`, `showSuccess()`
  - Expects CodeMirror 6 modules available via `window.CM` namespace
- [x] `blockscad/bsPage.js` — Modified:
  - Tab href changed from `#openScadPre` to `#codeEditorPane`
  - `<pre id="openScadPre">` replaced with `<div id="codeEditorPane">` containing toolbar + editor div
  - Toolbar has "Apply to Blocks" button (`#applyCodeBtn`) and status span (`#codeEditorStatus`)
- [x] `blockscad/style.css` — Modified:
  - Replaced `#openScadPre` styles with `#codeEditorPane`, `#codeEditorToolbar`, `#codeEditorDiv` styles
  - Added dark mode styles for toolbar and status messages
  - Editor pane uses flexbox layout (toolbar fixed, editor fills remaining space)

### Phase 3: OpenSCAD Parser + XML Generator
- [x] `blockscad/openscad-to-blocks.js` — Tokenizer + Parser:
  - **Tokenizer**: Full lexer producing NUMBER, STRING, IDENTIFIER, operators, brackets, etc.
  - **Parser**: Recursive descent producing AST nodes:
    - `ModuleCall`, `Assignment`, `ForLoop`, `IfElse`
    - `BinaryOp`, `UnaryOp`, `TernaryOp`, `FunctionCall`
    - `NumberLiteral`, `StringLiteral`, `BoolLiteral`, `VectorLiteral`, `VariableRef`, `RangeExpr`
  - Handles named arguments (`name=value`)
  - Rejects unsupported constructs (`module`, `function`, `include`, `use`) with errors
  - Exposes internals via `window._OpenSCADParserInternals`

- [x] `blockscad/ast-to-xml.js` — Expression-level XML generation:
  - `NumberLiteral` → `math_number`, `BoolLiteral` → `logic_boolean`
  - `VariableRef` → `variables_get`, `StringLiteral` → `text`
  - `BinaryOp` → `math_arithmetic` / `logic_compare` / `logic_operation`
  - `UnaryOp` (- / !) → `math_arithmetic MINUS` / `logic_negate`
  - `TernaryOp` → `logic_ternary`
  - `FunctionCall` → `math_single` / `math_round` / `math_arithmetic POWER`
  - Supports: sin, cos, tan, asin, acos, atan, abs, sqrt, ln, exp, log, round, ceil, floor, pow

- [x] `blockscad/ast-to-xml-statements.js` — Statement-level XML generation + public API:
  - **Primitives**: sphere, cube, cylinder, circle, square (with radius/diameter detection)
  - **Transforms**: translate, rotate (simple + fancy), scale, mirror → with PLUS mutations
  - **Set ops**: union (PLUS), difference (MINUS), intersection (WITH), hull (WITH) → with mutations
  - **Extrusions**: linear_extrude, rotate_extrude
  - **Color**: color([r,g,b]) → colour_picker with hex conversion
  - **Loops**: for → controls_for with VAR, FROM, TO, BY, DO
  - **Conditionals**: if/else if/else → controls_if with mutations
  - **Variables**: assignment → variables_set with <next> chaining
  - Exposes `window.BlockscadOpenscadToBlocks.convert(code)` → `{success, xml, errors}`

### Phase 2: Forward Sync (Blocks → Editor)
- [x] `blockscad/blockscad.js` — Modified `$('#displayCode').click()` handler:
  - Uses `BlockscadEditor.setValue(codeForOutput)` when CodeMirror is available
  - Falls back to highlight.js / plain text for `#openScadPre` if editor not loaded
  - Calls `BlockscadEditor.markClean()` after sync

### Phase 4: Reverse Sync (Code → Blocks)
- [x] `blockscad/blockscad.js` — Added `$('#applyCodeBtn').click()` handler:
  - Gets code from `BlockscadEditor.getValue()`
  - Calls `BlockscadOpenscadToBlocks.convert(code)`
  - On success: clears workspace, loads XML via `Blockly.Xml`, calls `assignBlockTypes()`
  - On error: shows error message via `BlockscadEditor.showError()`
  - Confirms before replacing existing blocks

### Script Loading
- [x] `index.html` — Added script tags for:
  - `blockscad/openscad-to-blocks.js` (tokenizer + parser)
  - `blockscad/ast-to-xml.js` (expression XML generator)
  - `blockscad/ast-to-xml-statements.js` (statement XML generator + public API)
  - `blockscad/codemirror-setup.js` (CodeMirror 6 editor)

---

## Remaining Work

### Phase 1 Completion: CodeMirror Bundle
**File:** `index.html` — Add CodeMirror 6 CDN scripts or bundle
- Need to decide: CDN vs vendored bundle
- `codemirror-setup.js` expects modules at `window.CM['@codemirror/view']` etc.
- Options:
  1. Use esm.sh CDN with importmap (simplest, requires internet)
  2. Install via npm + esbuild bundle into single IIFE file (offline-capable)
  3. Vendor pre-built bundle
- **Recommended:** npm install + esbuild bundle approach, add build script to package.json
- Packages needed: `@codemirror/view`, `@codemirror/state`, `@codemirror/language`, `@codemirror/commands`, `@codemirror/search`, `@codemirror/autocomplete`, `@codemirror/lint`, `@lezer/highlight`

### Phase 5: Polish
- Dark mode toggle should call `BlockscadEditor.updateTheme(isDark)`
- Tab switching: only regenerate code when switching Blocks→Code (not Code→Blocks)
- Dirty state indicator in toolbar
- Error highlighting in editor (CodeMirror diagnostics API)

---

## File Inventory

| File | Status | Notes |
|---|---|---|
| `blockscad/codemirror-setup.js` | Created | CM6 init, OpenSCAD mode, BlockscadEditor API |
| `blockscad/openscad-to-blocks.js` | Complete | Tokenizer + Parser, exposes internals |
| `blockscad/ast-to-xml.js` | Created | Expression nodes → Blockly XML |
| `blockscad/ast-to-xml-statements.js` | Created | Statement nodes → Blockly XML + public API |
| `blockscad/bsPage.js` | Modified | Tab href + editor pane HTML |
| `blockscad/style.css` | Modified | Editor pane + dark mode styles |
| `blockscad/blockscad.js` | Modified | Forward sync + reverse sync handlers |
| `index.html` | Modified | Script tags for parser, XML generator, CM6 setup |
| `package.json` | Not yet modified | npm deps + build script TODO |

---

## Key Design Decisions Made

1. **CodeMirror 6** (not 5) for modern API, better extensibility
2. **Global `window.CM` namespace** for CM modules (no ES module imports in main code)
3. **Stream-based syntax highlighting** (simpler than full Lezer grammar for OpenSCAD)
4. **Post-processed code parsing** — parser reads clean OpenSCAD after `processCodeForOutput`
5. **Flex layout** for code pane — toolbar stays fixed, editor fills remaining space
6. **Three separate files** for converter — `openscad-to-blocks.js` (parser), `ast-to-xml.js` (expressions), `ast-to-xml-statements.js` (statements + API)
7. **Global communication** between converter files via `window._OpenSCADParserInternals` and `window._ASTtoXMLExpressions`
