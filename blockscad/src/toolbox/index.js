// Toolbox public API
// Replaces toolbox.js with data-driven generation

import { colorSchemes, allCatNames, simpleCatIndices } from './color-schemes.js';
import { blocks3D, blocks2D, blocksTransform, blocksSetOps, blocksMath, blocksLogic, blocksLoops, blocksText } from './block-defs.js';
import { categoryToXml, customCategoryToXml } from './xml-builder.js';

// T and Msg are refreshed inside each public function because the Toolbox and
// Msg sub-objects may not exist yet when this module first loads.
let T = null;
let Msg = null;

export function createToolbox() {
  // Refresh Msg reference in case it was loaded after this module
  Msg = window.Blockscad.Msg;
  T = window.Blockscad.Toolbox;

  // Build advanced toolbox
  var adv = '<xml id="toolbox" style="display: none">';
  adv += categoryToXml(Msg.CATEGORY_3D_SHAPES, blocks3D, false);
  adv += categoryToXml(Msg.CATEGORY_2D_SHAPES, blocks2D, false);
  adv += categoryToXml(Msg.CATEGORY_TRANSFORMATIONS, blocksTransform, false);
  adv += categoryToXml(Msg.CATEGORY_SET_OPERATIONS, blocksSetOps, false);
  // Math and Logic are combined in one string in the original (two categories)
  adv += categoryToXml(Msg.CATEGORY_MATH, blocksMath, false);
  adv += categoryToXml(Msg.CATEGORY_LOGIC, blocksLogic, false);
  adv += categoryToXml(Msg.CATEGORY_LOOPS, blocksLoops, false);
  adv += categoryToXml(Msg.CATEGORY_TEXT, blocksText, false);
  adv += customCategoryToXml(Msg.CATEGORY_VARIBLES, 'VARIABLE');
  adv += customCategoryToXml(Msg.CATEGORY_PROCEDURES, 'PROCEDURE');
  adv += '</xml>';

  // Build simple toolbox
  var sim = '<xml id="toolbox" style="display: none">';
  sim += categoryToXml(Msg.CATEGORY_3D_SHAPES, blocks3D, true);
  // No 2D category in simple mode
  sim += categoryToXml(Msg.CATEGORY_TRANSFORMATIONS, blocksTransform, true);
  sim += categoryToXml(Msg.CATEGORY_SET_OPERATIONS, blocksSetOps, true);
  sim += categoryToXml(Msg.CATEGORY_MATH, blocksMath, true);
  // No Logic category in simple mode
  // No Loops category in simple mode
  sim += categoryToXml(Msg.CATEGORY_TEXT, blocksText, true);
  sim += customCategoryToXml(Msg.CATEGORY_VARIBLES, 'VARIABLE');
  sim += customCategoryToXml(Msg.CATEGORY_PROCEDURES, 'PROCEDURE');
  sim += '</xml>';

  T.adv = adv;
  T.sim = sim;

  // Also preserve the color scheme infrastructure
  T.allcats = allCatNames;
  T.whichCatsInSimple = simpleCatIndices;
  T.colorScheme = colorSchemes;
  T.catHex = [];
  T.simpCatHex = [];
}

export function setColorScheme(color_scheme) {
  T = window.Blockscad.Toolbox;
  for (var i = 0; i < T.allcats.length; i++) {
    T[T.allcats[i]] = color_scheme[i];
    T.catHex[i] = color_scheme[i];
  }
}

export function setCatColors() {
  T = window.Blockscad.Toolbox;
  if (T.catIDs.length < T.allcats.length) {
    for (var i = 0; i < T.catIDs.length; i++) {
      var element = document.getElementById(T.catIDs[i]);
      element.style.background = T.catHex[T.whichCatsInSimple[i]];
    }
  } else {
    for (var i = 0; i < T.catIDs.length; i++) {
      var element = document.getElementById(T.catIDs[i]);
      element.style.background = T.catHex[i];
    }
  }
}
