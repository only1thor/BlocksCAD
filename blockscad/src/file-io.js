// File I/O functionality
// Extracted from blockscad.js lines ~662-875, 1004-1068, 1830-1875

const B = window.Blockscad;

export function loadLocalBlocks(e) {
  var evt = e;
  if (evt.target.files.length) {
    if (B.needToSave) {
      window.promptForSave().then(function(wantToSave) {
        if (wantToSave=="cancel") {
          return;
        }
        if (wantToSave=="nosave")
          B.setSaveNeeded();
        else if (wantToSave=="save")
          B.saveBlocks();

        B.createNewProject();
        readSingleFile(evt, true);
      }).catch(function(result) {
        console.log("caught an error in new project.  result is:" + result);
      });
    }
    else {
      B.createNewProject();
      readSingleFile(evt, true);
    }
  }
}

export function readSingleFile(evt, replaceOld) {
  var f = evt.target.files[0];

  if (f) {
    var proj_name;

    if (replaceOld) {
      proj_name = f.name.substr(0, f.name.lastIndexOf('(')) || f.name;
      proj_name = proj_name.substr(0, f.name.lastIndexOf('.')) || proj_name;
      proj_name = proj_name.replace(/^\s+|\s+$/g, '');
    }

    if (replaceOld) {
      B.Auth.currentProject = '';
    }

    if (replaceOld)
      Blockly.getMainWorkspace().clear();

    var r = new FileReader();
    r.onload = function(e) {
      var contents = e.target.result;
      var xml = Blockly.Xml.textToDom(contents);
      Blockly.Xml.domToWorkspace(xml, B.workspace);
      Blockly.svgResize(B.workspace);
      clearStlBlocks();
    };
    r.readAsText(f);

    $("#importLocal")[0].value = '';
    $("#loadLocal")[0].value = '';

    if (replaceOld)
      $('#project-name').val(proj_name);

    $('#projectView').addClass('hidden');
    $('#editView').removeClass('hidden');

    if (!B.offline) $('#bigsavebutton').removeClass('hidden');

    $('#displayBlocks').click();
    window.dispatchEvent(new Event('resize'));
    B.gProcessor.clearViewer();

  }
}

export function readStlFile(evt) {
  var f = evt.target.files[0];

  if (f) {
    var r = new FileReader();

    r.onload = function(e) {
      var contents = e.target.result;
      var result = importSTL(contents);
      var src = result[0];
      var center = result[1];
      if (!center) center = 'blah';
      var proj_name = f.name.substr(0, f.name.lastIndexOf('(')) || f.name;
      proj_name = proj_name.substr(0, f.name.lastIndexOf('.')) || proj_name;
      proj_name = proj_name.replace(/^\s+|\s+$/g, '');
      var proj_name_use = proj_name;
      var add = 1;
      var found_file = 0;
      while (B.csg_commands[proj_name_use] && !found_file) {
        if (src != B.csg_commands[proj_name_use]) {
          proj_name_use = proj_name + '_' + add;
          add++;
        }
        else found_file = 1;
      }
      B.csg_commands[proj_name_use] = src;
      if (!found_file)
        B.csg_filename[proj_name_use] = f.name + ':::';
      else B.csg_filename[proj_name_use] += f.name + ':::';

      B.csg_center[proj_name_use] = center;
      var bt_input;
      if (B.currentInterestingBlock) {
        var fn_input = B.currentInterestingBlock.getField('STL_FILENAME');
        bt_input = B.currentInterestingBlock.getField('STL_BUTTON');
        var ct_input = B.currentInterestingBlock.getField('STL_CONTENTS');
        fn_input.setText(f.name);
        fn_input.setVisible(true);
        bt_input.setVisible(false);
        ct_input.setText(proj_name_use);
        B.currentInterestingBlock.setCommentText(f.name + '\ncenter:(' + center + ')');
        B.currentInterestingBlock = null;
      }
      else {
        var xml = '<xml xmlns="http://blockscad.einsteinsworkshop.com"><block type="stl_import" id="1" x="0" y="0"><field name="STL_FILENAME">' +
        f.name + '</field>' + '<field name="STL_BUTTON">' + B.Msg.BROWSE + '</field>' +
        '<field name="STL_CONTENTS">'+ proj_name_use + '</field></block></xml>';
        var stuff = Blockly.Xml.textToDom(xml);
        var newblock = Blockly.Xml.domToBlock(B.workspace, stuff.firstChild);
        newblock.moveBy(20 + B.workspace.getMetrics().viewLeft / B.workspace.scale,
          20 + B.workspace.getMetrics().viewTop / B.workspace.scale);
        bt_input = newblock.getField('STL_BUTTON');
        bt_input.setVisible(false);
        newblock.setCommentText(f.name + '\ncenter:(' + center + ')');
        newblock.render();
      }
    };
    r.readAsBinaryString(f);
    $("#importStl")[0].value = '';
    $('#displayBlocks').click();

  } else {
    alert("Failed to load file");
  }
}

export function showExample(e) {
  var example = "examples/" + e.data.msg;
  var name = e.data.msg.split('.')[0];

  if (B.needToSave) {
    window.promptForSave().then(function(wantToSave) {
      if (wantToSave=="cancel") {
        return;
      }
      if (wantToSave=="nosave")
        B.setSaveNeeded();
      else if (wantToSave=="save")
        B.saveBlocks();

      getExample(example, name);
    }).catch(function(result) {
      console.log("caught an error in show example 1.  result is:" + result);
    });
  }
  else {
    getExample(example, name);
  }
}

export function getExample(example, name) {
  $.get(example, function(data) {
    B.clearProject();
    var xmlString;
    if (window.ActiveXObject) {
      xmlString = data.xml;
    }
    else {
      xmlString = (new XMLSerializer()).serializeToString(data);
    }
    var xml = Blockly.Xml.textToDom(xmlString);
    Blockly.Xml.domToWorkspace(xml, B.workspace);
    Blockly.svgResize(B.workspace);
    $('#project-name').val(name + ' example');
    setTimeout(B.setSaveNeeded, 300);
  });
}

export function clearStlBlocks() {
  var blocks = B.workspace.getAllBlocks();
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].type == 'stl_import') {
      var browse_button = blocks[i].getField('STL_BUTTON');
      blocks[i].getField('STL_CONTENTS').setText('');
      blocks[i].getField('STL_FILENAME').setText('');
      var cText = blocks[i].getCommentText();
      if (!cText.match(/^RELOAD/)) cText = 'RELOAD: ' + cText;
      blocks[i].setCommentText(cText);
      browse_button.setText('Reload');

      blocks[i].backlight();
      var others = blocks[i].collapsedParents();
      if (others)
        for (var j = 0; j < others.length; j++)
          others[j].backlight();

      if (!blocks[i].isCollapsed()) {
        browse_button.setVisible(true);
      }

      var parent = blocks[i];
      var collapsedParent = null;
      while (parent) {
        if (parent.isCollapsed()) {
          collapsedParent = parent;
        }
        parent = parent.getSurroundParent();
      }
      if (collapsedParent) {
        collapsedParent.setCollapsed(true, true);
      }
      blocks[i].render();

      $('#error-message').html(B.Msg.WARNING_RELOAD_STL);
    }
  }
}

export function saveBlocksLocal() {
  var xmlDom = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
  var xmlText = Blockly.Xml.domToText(xmlDom);
  var blob = new Blob([xmlText], {type: "text/plain;charset=utf-8"});

  var blocks_filename = $('#project-name').val();
  if (blocks_filename) {
    saveAs(blob, blocks_filename + ".xml");
    B.setSaveNeeded();
  }
  else {
    alert(B.Msg.SAVE_FAILED + '!\n' + B.Msg.SAVE_FAILED_PROJECT_NAME);
  }
}

export function savePicLocal(pic) {
  var blob = new Blob([pic], {type: "img/jpeg"});
  saveAs(blob, "tryThis.jpg");
}

export function saveOpenscadLocal() {
  var preCode = Blockly.OpenSCAD.workspaceToCode(B.workspace);
  var code = B.processCodeForOutput(preCode);
  var blob = new Blob([code], {type: "text/plain;charset=utf-8"});

  var blocks_filename = $('#project-name').val();
  if (blocks_filename) {
    saveAs(blob, blocks_filename + ".scad");
  }
  else {
    alert("SAVE FAILED.  Please give your project a name, then try again.");
  }
}
