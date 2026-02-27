// Rendering functionality
// Extracted from blockscad.js lines ~1199-1398, 1919-1951

const B = window.Blockscad;

export function mixes2and3D() {
  var topBlocks = [];
  topBlocks = B.workspace.getTopBlocks();
  var hasCSG = 0;
  var hasCAG = 0;
  var hasUnknown = 0;
  var hasShape = 0;

  for (var i = 0; i < topBlocks.length; i++) {
    if (B.stackIsShape(topBlocks[i])) {
      hasShape = 1;
      var cat = topBlocks[i].category;
      var mytype;
      if (cat == 'PRIMITIVE_CSG') hasCSG++;
      if (cat == 'PRIMITIVE_CAG') hasCAG++;
      if (cat == 'TRANSFORM' || cat == 'SET_OP') {
        mytype = topBlocks[i].getInput('A').connection.check_;
        if (mytype.length == 1 && mytype[0] == 'CSG') hasCSG++;
        if (mytype.length == 1 && mytype[0] == 'CAG') hasCAG++;
      }
      if (cat == 'LOOP') {
        mytype = topBlocks[i].getInput('DO').connection.check_;
        if (mytype.length == 1 && mytype[0] == 'CSG') hasCSG++;
        if (mytype.length == 1 && mytype[0] == 'CAG') hasCAG++;
      }
      if (cat == 'COLOR') hasCSG++;
      if (cat == 'EXTRUDE') hasCSG++;
      if (topBlocks[i].type == 'controls_if') hasUnknown++;
    }
  }
  if (hasShape && !(hasCSG + hasCAG + hasUnknown)) {
    B.assignBlockTypes(B.workspace.getTopBlocks());
  }
  return [(hasCSG && hasCAG), hasShape];
}

export function doRender() {
  $('#error-message').html("");
  $('#error-message').removeClass("has-error");

  $('#renderButton').prop('disabled', true);

  B.gProcessor.clearViewer();

  var mixes = mixes2and3D();

  if (mixes[1] === 0) {
    $('#error-message').html(B.Msg.ERROR_MESSAGE + ": " + B.Msg.RENDER_ERROR_EMPTY);
    $('#error-message').addClass("has-error");
    $('#renderButton').prop('disabled', false);
    return;
  }

  if (mixes[0]) {
    $('#error-message').html(B.Msg.ERROR_MESSAGE + ": " + B.Msg.RENDER_ERROR_MIXED);
    $('#error-message').addClass("has-error");
    $('#renderButton').prop('disabled', false);
    return;
  }

  B.missingFields = [];
  B.illegalValue = [];
  var code = Blockly.OpenSCAD.workspaceToCode(B.workspace);
  var gotErr = false;
  var others, blk;

  if (B.missingFields.length > 0) {
    for (var i = 0; i < B.missingFields.length; i++) {
      blk = B.workspace.getBlockById(B.missingFields[i]);
      blk.unselect();
      blk.backlight();
      others = blk.collapsedParents();
      if (others)
        for (var j = 0; j < others.length; j++) {
          others[j].unselect();
          others[j].backlight();
        }
      gotErr = true;
    }
  }
  if (B.illegalValue.length > 0) {
    for (var i = 0; i < B.illegalValue.length; i++) {
      blk = B.workspace.getBlockById(B.illegalValue[i]);
      blk.unselect();
      blk.backlight();
      others = blk.collapsedParents();
      if (others)
        for (var j = 0; j < others.length; j++) {
          others[j].unselect();
          others[j].backlight();
        }
    }
    gotErr = true;
  }
  if (gotErr) {
    var errText = '';
    var error = '';
    if (B.missingFields.length) {
      error = B.Msg.ERROR_MESSAGE + ": " + B.Msg.PARSING_ERROR_MISSING_FIELDS;
      errText = error.replace("%1", B.missingFields.length + " ");
    }
    if (B.missingFields.length && B.illegalValue.length)
      errText += "<br>";
    if (B.illegalValue.length) {
      error = B.Msg.ERROR_MESSAGE + ": " + B.Msg.PARSING_ERROR_ILLEGAL_VALUE;
      errText += error.replace("%1", B.illegalValue.length + " ");
    }

    $('#error-message').html(errText);
    $('#error-message').addClass("has-error");
    $('#renderButton').prop('disabled', false);
    return;
  }

  B.resolution = $('input[name="resolution"]:checked').val();

  B.loadTheseFonts = B.whichFonts(code);
  $('#renderButton').html('working');

  if (B.loadTheseFonts.length > 0) {
    B.numloaded = 0;
    for (var i = 0; i < B.loadTheseFonts.length; i++) {
      B.loadFontThenRender(i, code);
    }
  }
  else {
    renderCode(code);
  }
}

export function renderCode(code) {
  B.gProcessor.setBlockscad(code);
}

export function resetView() {
  if (B.gProcessor != null) {
    if (B.gProcessor.viewer) {
      B.gProcessor.viewer.viewReset();
    }
  }
}

export function processCodeForOutput(code) {
  var re0 = /( *)assign\((\$fn=.+)\){(.+)/g;
  var output0 = code.replace(re0, "$1{\n$1  $2; $3");

  var re = /( *)assign\((.+)\){/gm;
  var output = output0.replace(re, "$1$2;");

  var re2 = /(\w+ = \w+),/g;
  var output2 = output.replace(re2, "$1;  ");

  var re3 = /.+end assign\n/g;
  var output3 = output2.replace(re3, "");

  var output4 = output3.replace(/\n\s*\n\s*\n/g, '\n\n');

  var output5 = output4.replace(/group\(\)\{/g, 'union(){');

  return output5;
}
