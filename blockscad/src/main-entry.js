// ES module entry point for BlocksCAD
// Loaded after all legacy script tags. Uses strangler fig pattern to
// progressively replace global functions with module versions.

import { VERSION, RELEASE_DATE, PIC_SIZE, RPIC_SIZE, PIC_QUALITY, NUM_ROT_PICS, DEFAULT_RESOLUTION } from './config.js';
import { initDarkMode, toggleDarkMode, applyDarkMode } from './dark-mode.js';
import { takeRPic, takePic, cameraPic, savePic } from './pictures.js';
import { newProject, createNewProject, clearProject, discard, setSaveNeeded, saveBlocks, promptForSave } from './projects.js';
import { saveBlocksLocal, saveOpenscadLocal, loadLocalBlocks, readStlFile, readSingleFile, showExample, getExample, clearStlBlocks, savePicLocal } from './file-io.js';
import { typeWorkspace, typeNewStack, assignBlockTypes, assignVarTypes, handleWorkspaceEvents, getExtraRootBlock, getBlockFromId, findBlockType, hasParentOfType, doVariableHack, stackIsShape, hasExtrudeParent, executeAfterDrag_, arraysEqual } from './typing.js';
import { doRender, renderCode, mixes2and3D, processCodeForOutput, resetView } from './rendering.js';
import { returnIfVarCode } from './code-output.js';
import { createToolbox, setColorScheme, setCatColors } from './toolbox/index.js';

const B = window.Blockscad;

// Phase 2: Override blockscad.js functions with module versions
// Config
B.version = VERSION;
B.releaseDate = RELEASE_DATE;
B.picSize = PIC_SIZE;
B.rpicSize = RPIC_SIZE;
B.picQuality = PIC_QUALITY;
B.numRotPics = NUM_ROT_PICS;
B.resolution = DEFAULT_RESOLUTION;

// Dark mode
B.initDarkMode = initDarkMode;
B.toggleDarkMode = toggleDarkMode;
B.applyDarkMode = applyDarkMode;

// Pictures
B.takeRPic = takeRPic;
B.takePic = takePic;
B.cameraPic = cameraPic;
B.savePic = savePic;

// Projects
B.newProject = newProject;
B.createNewProject = createNewProject;
B.clearProject = clearProject;
B.discard = discard;
B.setSaveNeeded = setSaveNeeded;
B.saveBlocks = saveBlocks;

// File I/O
B.saveBlocksLocal = saveBlocksLocal;
B.saveOpenscadLocal = saveOpenscadLocal;
B.loadLocalBlocks = loadLocalBlocks;
B.readStlFile = readStlFile;
B.showExample = showExample;
B.getExample = getExample;
B.clearStlBlocks = clearStlBlocks;
B.savePicLocal = savePicLocal;
// readSingleFile is also used as a bare global
window.readSingleFile = readSingleFile;

// Typing
B.typeWorkspace = typeWorkspace;
B.typeNewStack = typeNewStack;
B.assignBlockTypes = assignBlockTypes;
B.assignVarTypes = assignVarTypes;
B.handleWorkspaceEvents = handleWorkspaceEvents;
B.getExtraRootBlock = getExtraRootBlock;
B.getBlockFromId = getBlockFromId;
B.findBlockType = findBlockType;
B.hasParentOfType = hasParentOfType;
B.doVariableHack = doVariableHack;
B.stackIsShape = stackIsShape;
B.hasExtrudeParent = hasExtrudeParent;
B.executeAfterDrag_ = executeAfterDrag_;
B.arraysEqual = arraysEqual;

// Rendering
B.doRender = doRender;
B.renderCode = renderCode;
B.mixes2and3D = mixes2and3D;
B.processCodeForOutput = processCodeForOutput;
B.resetView = resetView;

// Code output (assigned to Blockly.OpenSCAD)
window.Blockly.OpenSCAD.returnIfVarCode = returnIfVarCode;

// Phase 3: Data-driven toolbox
B.Toolbox.createToolbox = createToolbox;
B.Toolbox.setColorScheme = setColorScheme;
B.Toolbox.setCatColors = setCatColors;

// Also expose promptForSave globally since it's used as a bare function
window.promptForSave = promptForSave;

console.log('[BlocksCAD] Module system loaded (v' + VERSION + ')');
