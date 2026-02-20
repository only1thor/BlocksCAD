# AGENTS.md - BlocksCAD Codebase Guide

This document provides guidance for AI coding agents working in the BlocksCAD codebase.

## Project Overview

BlocksCAD is a visual programming tool for 3D CAD design built with JavaScript. It uses Google's Blockly library (customized fork) for visual block programming and OpenJSCAD for CSG rendering.

**Key Technologies:**
- JavaScript (browser-based, client-side)
- Google Blockly (visual programming)
- OpenJSCAD (3D rendering)
- Bootstrap 3.3.4 / jQuery 1.11.3
- Google Closure Library

## Project Structure

```
BlocksCAD/
├── blockscad/           # Main application code
│   ├── blockscad.js     # Main application logic
│   ├── utils.js         # Utility functions (BSUtils)
│   ├── storage.js       # LocalStorage/cloud storage
│   ├── toolbox.js       # Toolbox configuration
│   └── msg/             # BlocksCAD i18n messages
├── blockly/             # Google Blockly library (customized fork)
│   ├── blocks/          # Block definitions
│   ├── generators/      # Code generators
│   │   └── openscad/    # OpenSCAD-specific generators
│   ├── msg/             # Blockly i18n messages
│   └── tests/           # JSUnit tests
├── openscad-openjscad-translator/  # OpenSCAD parser (submodule)
│   ├── src/             # Parser source files
│   └── tests/           # Parser tests
├── closure-library/     # Google Closure Library
├── index.html           # Main entry point
└── package.json         # NPM configuration
```

## Development Environment (NixOS)

This project uses Nix flakes for reproducible development environments. On NixOS, use the flake to access dev tools:

```bash
# Enter dev shell (interactive)
nix develop

# Run a single command with dev tools
nix develop -c npm run lint
nix develop -c npm install
nix develop -c node some-script.js

# Available tools in the dev shell:
# - nodejs_20, npm
# - jshint (linting)
# - openscad (for testing generated code)
```

**Important:** Always use `nix develop -c <command>` to run tooling commands, as npm/node may not be available system-wide on NixOS.

## Build/Lint/Test Commands

### Linting
```bash
nix develop -c npm run lint  # Lint blockly + blockscad directories (uses JSHint)
```

### Building
```bash
npm run build-standalone   # Build standalone desktop app (NW.js)
npm run clean-standalone   # Clean build artifacts
```

### Running Tests

**OpenSCAD-OpenJSCAD Translator Tests:**
```bash
# Run all translator tests
cd openscad-openjscad-translator && node tests/all-tests.js

# Run a single test file
cd openscad-openjscad-translator && node tests/primitive_solids.js
cd openscad-openjscad-translator && node tests/transformations.js
cd openscad-openjscad-translator && node tests/modules.js
```

**Blockly Tests:**
- Open `blockly/tests/playground.html` in a browser
- Individual JSUnit tests in `blockly/tests/jsunit/` (browser-based)

## Code Style Guidelines

### File Headers and Strict Mode
All files should include the GPL-3.0 license header and use strict mode:
```javascript
/*
    Copyright (C) 2014-2015  H3XL, Inc
    This program is free software...
*/
'use strict';
```

### Namespace Pattern
Use namespace objects to avoid global pollution:
```javascript
var Blockscad = Blockscad || {};
Blockscad.Toolbox = Blockscad.Toolbox || {};
var BSUtils = BSUtils || {};
```

### Naming Conventions
- **Functions/Methods:** camelCase - `Blockscad.doRender()`, `BSUtils.getLang()`
- **Namespaces/Constructors:** PascalCase - `Blockscad`, `BSUtils`, `Blockly`
- **Constants:** UPPER_SNAKE_CASE - `BSUtils.LANGUAGE_NAME`, `Blockly.OpenSCAD.ORDER_ATOMIC`
- **Private functions:** trailing underscore - `BSUtils.dialogKeyDown_`
- **Variables:** camelCase - `currentProject`, `needToSave`

### Indentation and Formatting
- **Indentation:** 2 spaces (Google/Blockly style)
- **Max line length:** 120 characters
- **Linebreaks:** Unix style (LF)
- **Semicolons:** Required
- **No space before function parentheses:** `function()` not `function ()`
- **Curly braces:** Required for multi-line blocks

### Imports (Google Closure)
```javascript
goog.provide('Blockly.OpenSCAD');
goog.require('Blockly.Generator');
goog.require('Blockly.Blocks');
```

### Block Definition Pattern
When defining new Blockly blocks:
```javascript
Blockly.Blocks['sphere'] = {
  init: function() {
    this.category = 'PRIMITIVE_CSG';
    this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockscad.Toolbox.HEX_3D_PRIMITIVE);
    this.appendDummyInput()
        .appendField(Blockscad.Msg.SPHERE + "  ");
    this.appendValueInput("RAD")
        .setCheck("Number")
        .appendField(Blockscad.Msg.RADIUS)
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setPreviousStatement(true, 'CSG');
    this.setTooltip(Blockscad.Msg.SPHERE_TOOLTIP);
  }
};
```

### Error Handling
- Use callbacks with error parameters for async operations
- Use `try/catch` blocks for parsing and file operations
- Check for null/undefined workspace before DOM operations:
```javascript
if (!this.workspace) {
  // Block has been deleted.
  return;
}
```

### Global Variables
Known globals (don't redeclare):
- `Blockly` - Blockly library
- `Blockscad` - BlocksCAD application namespace
- `BSUtils` - BlocksCAD utilities
- `goog` - Google Closure Library
- `$` - jQuery

## Important Notes

1. **No ES6 modules** - Uses script tags in HTML for imports
2. **Blockly is a customized fork** - Be careful with upstream changes
3. **i18n** - Use `Blockscad.Msg.*` and `Blockly.Msg.*` for user-facing strings
4. **Colors** - Use `Blockscad.Toolbox.HEX_*` constants for block colors
5. **CSG Types** - Blocks use `'CSG'` type for 3D geometry connections
