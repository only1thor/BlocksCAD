# AGENTS.md - BlocksCAD

## What It Is

Browser-based visual 3D CAD tool. Blockly (custom fork) for block programming, OpenJSCAD for CSG rendering. jQuery 1.11, Bootstrap 3, Google Closure.

## Structure

```
blockscad/
  blockscad.js        # Init orchestrator (~526 lines), namespace setup
  toolbox.js          # Namespace stub (module-replaced)
  app-bundle.js       # ES module bundle (esbuild, auto-generated)
  cm6-bundle.js       # CodeMirror 6 bundle (auto-generated)
  src/
    main-entry.js     # ES module entry — wires modules onto window.Blockscad
    config.js          dark-mode.js       pictures.js
    projects.js        file-io.js         typing.js
    rendering.js       code-output.js     global-interface.js
    toolbox/
      block-defs.js    xml-builder.js     color-schemes.js    index.js
blockly/              # Blockly fork — DO NOT modify
  blocks/             # Block definitions (reference Blockscad.Toolbox.HEX_*)
  generators/openscad/
index.html            # 33 script tags + app-bundle.js last
```

## Build

```bash
nix develop -c npm run build     # build:cm6 + build:app + test (209 tests)
nix develop -c npm run build:app # just the ES module bundle
```

On non-NixOS: `npm run build` directly.

## Architecture

**Strangler fig pattern**: `app-bundle.js` loads after legacy scripts and overwrites `Blockscad.*` / `Blockly.OpenSCAD.*` with ES module versions. Blockly block definitions still read globals (`Blockscad.missingFields`, `.resolution`, `.doVariableHack`, `.workspace`, `.Toolbox.HEX_*`, `.Msg.*`).

**Toolbox**: Data-driven. `block-defs.js` defines blocks as objects with `{ type, values, advancedOnly }`. `xml-builder.js` generates XML. No more duplicated XML strings.

**Typing system** (`typing.js`): Uses `setTimeout(fn, 0)` for timing. Highest-risk module — test block connect/disconnect, variable renaming, procedure definitions thoroughly.

## Constraints

- Blockly fork and jQuery: untouched
- `Blockscad` global namespace must stay accessible to Blockly block definitions/generators
- See `global-interface.js` for which properties must remain global

## Style

2-space indent, semicolons, camelCase functions, PascalCase namespaces, UPPER_SNAKE constants. `Blockscad.Msg.*` for i18n. `'CSG'`/`'CAG'` for geometry type connections.
