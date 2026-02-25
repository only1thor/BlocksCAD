// Toolbox initialization (legacy)
// The actual toolbox generation is now handled by blockscad/src/toolbox/.
// This file retains only the namespace setup and catIDs array needed before
// the app-bundle.js loads and overwrites createToolbox/setColorScheme/setCatColors.

var Blockscad = Blockscad || {};
Blockscad.Toolbox = Blockscad.Toolbox || {};
Blockly = Blockly || {};

// for switching toolboxes, I need to know the current html category ids.
Blockscad.Toolbox.catIDs = [];
