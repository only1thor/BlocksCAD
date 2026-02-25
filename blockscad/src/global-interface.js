// Global Interface Documentation
// These Blockscad.* properties MUST remain globally accessible
// because Blockly block definitions and generators reference them directly.
//
// Required by Blockly block definitions (blockly/blocks/*.js):
//   Blockscad.missingFields    - array, populated during code generation
//   Blockscad.illegalValue     - array, populated during code generation
//   Blockscad.csg_commands     - object, holds converted STL file contents
//   Blockscad.resolution       - number, default $fn value for parser
//   Blockscad.doVariableHack   - function, checks if variable needs assign() scope
//   Blockscad.workspace        - Blockly workspace instance
//
// Required by Blockly generators (openscad_compressed.js):
//   Blockscad.missingFields
//   Blockscad.illegalValue
//   Blockscad.csg_commands
//   Blockscad.resolution
//   Blockscad.doVariableHack
//   Blockly.OpenSCAD.returnIfVarCode
//
// Required by toolbox color system:
//   Blockscad.Toolbox.HEX_3D_PRIMITIVE .. HEX_PROCEDURE
//   Blockscad.Toolbox.catIDs
//   Blockscad.Toolbox.allcats
//   Blockscad.Toolbox.whichCatsInSimple
//   Blockscad.Toolbox.catHex
//   Blockscad.Toolbox.colorScheme
//   Blockscad.Toolbox.setColorScheme
//   Blockscad.Toolbox.setCatColors
//   Blockscad.Toolbox.adv / .sim
//
// Required by localization:
//   Blockscad.Msg.*
//
// Required by other script-tag files (bsPage.js, viewer.js, etc.):
//   Blockscad.gProcessor
//   Blockscad.drawAxes
//   Blockscad.offline
//   Blockscad.standalone
//   Blockscad.version
//   Blockscad.Auth.*
//
// Properties that can be internalized (module-private):
//   renderActions       -> private in rendering.js (currently kept on Blockscad for executeAfterDrag_)
//   needToSave          -> managed via setSaveNeeded() in projects.js
//   picSize, rpicSize, picQuality, numRotPics -> config.js exports
//   defaultColor        -> module scope (set in init)
//   inputVersion        -> module scope (set in init)
//   isDarkMode          -> managed via dark-mode.js functions
