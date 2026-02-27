(() => {
  // blockscad/src/config.js
  var VERSION = "1.7.3";
  var RELEASE_DATE = "2017/03/28";
  var PIC_SIZE = [450, 450];
  var RPIC_SIZE = [250, 250];
  var PIC_QUALITY = 0.85;
  var NUM_ROT_PICS = 13;
  var DEFAULT_RESOLUTION = 1;

  // blockscad/src/dark-mode.js
  var B = window.Blockscad;
  function toggleDarkMode() {
    B.isDarkMode = !B.isDarkMode;
    applyDarkMode(B.isDarkMode);
    localStorage.setItem("blockscadDarkMode", B.isDarkMode ? "1" : "0");
  }
  function applyDarkMode(enabled) {
    B.isDarkMode = enabled;
    if (enabled) {
      document.body.classList.add("dark-mode");
      if (B.gProcessor && B.gProcessor.viewer) {
        B.gProcessor.viewer.gl.clearColor(0.12, 0.12, 0.12, 1);
        B.gProcessor.viewer.onDraw();
      }
      if (B.gProcessor && B.gProcessor.picviewer) {
        B.gProcessor.picviewer.gl.clearColor(0.12, 0.12, 0.12, 1);
      }
      if (B.gProcessor && B.gProcessor.rpicviewer) {
        B.gProcessor.rpicviewer.gl.clearColor(0.12, 0.12, 0.12, 1);
      }
    } else {
      document.body.classList.remove("dark-mode");
      if (B.gProcessor && B.gProcessor.viewer) {
        B.gProcessor.viewer.gl.clearColor(1, 1, 1, 1);
        B.gProcessor.viewer.onDraw();
      }
      if (B.gProcessor && B.gProcessor.picviewer) {
        B.gProcessor.picviewer.gl.clearColor(1, 1, 1, 1);
      }
      if (B.gProcessor && B.gProcessor.rpicviewer) {
        B.gProcessor.rpicviewer.gl.clearColor(1, 1, 1, 1);
      }
    }
  }
  function initDarkMode() {
    var savedPref = localStorage.getItem("blockscadDarkMode");
    if (savedPref === "1") {
      applyDarkMode(true);
    }
  }

  // blockscad/src/pictures.js
  var B2 = window.Blockscad;
  function takeRPic() {
    if (B2.gProcessor != null) {
      var strip = B2.gProcessor.imgStrip;
      if (strip)
        savePic(strip, $("#project-name").val() + ".jpg");
    }
  }
  function savePic(image, name) {
    if (image) {
      var bytestream = atob(image.split(",")[1]);
      var mimestring = image.split(",")[0].split(":")[1].split(";")[0];
      var ab = new ArrayBuffer(bytestream.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < bytestream.length; i++) {
        ia[i] = bytestream.charCodeAt(i);
      }
      var blob = new Blob([ab], { type: "img/jpeg" });
      saveAs(blob, name);
    }
  }
  function takePic() {
    if (B2.gProcessor) {
      if (B2.gProcessor.img && B2.gProcessor.img != "null")
        savePic(B2.gProcessor.img, $("#project-name").val() + ".jpg");
    }
  }
  function cameraPic() {
    if (B2.gProcessor.viewer) {
      var image = B2.gProcessor.viewer.takeCameraPic(0.95);
      if (image)
        savePic(image, $("#project-name").val() + ".jpg");
    }
  }

  // blockscad/src/projects.js
  var B3 = window.Blockscad;
  function newProject() {
    $("#displayBlocks").click();
    if (B3.needToSave) {
      promptForSave().then(function(wantToSave) {
        if (wantToSave == "cancel") {
          return;
        }
        if (wantToSave == "nosave")
          setSaveNeeded();
        else if (wantToSave == "save")
          saveBlocks();
        createNewProject();
      }).catch(function(result) {
        console.log("caught an error in new project.  result is:" + result);
      });
    } else {
      createNewProject();
    }
  }
  function createNewProject() {
    clearProject();
    B3.workspace.clearUndo();
    setTimeout(setSaveNeeded, 300);
    $("#displayBlocks").click();
    if (!B3.offline)
      $("#bigsavebutton").removeClass("hidden");
  }
  function promptForSave() {
    var message = "<h4>" + B3.Msg.SAVE_PROMPT + "</h4>";
    return new Promise(function(resolve, reject) {
      bootbox.dialog({
        message,
        backdrop: true,
        size: "small",
        buttons: {
          save: {
            label: B3.Msg.SAVE_PROMPT_YES,
            className: "btn-default btn-lg primary pull-right giant-yes",
            callback: function(result) {
              resolve("save");
            }
          },
          dont_save: {
            label: B3.Msg.SAVE_PROMPT_NO,
            className: "btn-default btn-lg primary pull-left giant-yes",
            callback: function(result) {
              resolve("nosave");
            }
          }
        },
        onEscape: function() {
          resolve("cancel");
        }
      });
    });
  }
  function saveBlocks() {
    if (!B3.offline && B3.Auth.isLoggedIn) {
      B3.Auth.saveBlocksToAccount();
    } else {
      B3.saveBlocksLocal();
    }
  }
  function setSaveNeeded(saveNeeded) {
    if (saveNeeded) {
      B3.needToSave = 1;
    } else {
      B3.needToSave = 0;
    }
  }
  function clearProject() {
    if (!B3.offline) {
      B3.Auth.currentProject = "";
      B3.Auth.currentProjectKey = "";
    }
    B3.workspace.clear();
    B3.gProcessor.clearViewer();
    $("#project-name").val(B3.Msg.PROJECT_NAME_DEFAULT);
    $("#projectView").addClass("hidden");
    $("#editView").removeClass("hidden");
    $("#bigsavebutton").removeClass("hidden");
    window.dispatchEvent(new Event("resize"));
  }
  function discard() {
    var count = B3.workspace.getAllBlocks().length;
    if (count < 2) {
      B3.workspace.clear();
      window.location.hash = "";
    } else {
      var message = B3.Msg.DISCARD_ALL.replace("%1", count);
      bootbox.confirm({
        size: "small",
        message,
        buttons: {
          confirm: {
            label: B3.Msg.CONFIRM_DIALOG_YES,
            className: "btn-default confirm-yes"
          },
          cancel: {
            label: B3.Msg.CONFIRM_DIALOG_NO,
            className: "btn-default confirm-yes"
          }
        },
        callback: function(result) {
          if (result) {
            B3.workspace.clear();
            window.location.hash = "";
          }
        }
      });
    }
  }

  // blockscad/src/file-io.js
  var B4 = window.Blockscad;
  function loadLocalBlocks(e) {
    var evt = e;
    if (evt.target.files.length) {
      if (B4.needToSave) {
        window.promptForSave().then(function(wantToSave) {
          if (wantToSave == "cancel") {
            return;
          }
          if (wantToSave == "nosave")
            B4.setSaveNeeded();
          else if (wantToSave == "save")
            B4.saveBlocks();
          B4.createNewProject();
          readSingleFile(evt, true);
        }).catch(function(result) {
          console.log("caught an error in new project.  result is:" + result);
        });
      } else {
        B4.createNewProject();
        readSingleFile(evt, true);
      }
    }
  }
  function readSingleFile(evt, replaceOld) {
    var f = evt.target.files[0];
    if (f) {
      var proj_name;
      if (replaceOld) {
        proj_name = f.name.substr(0, f.name.lastIndexOf("(")) || f.name;
        proj_name = proj_name.substr(0, f.name.lastIndexOf(".")) || proj_name;
        proj_name = proj_name.replace(/^\s+|\s+$/g, "");
      }
      if (replaceOld) {
        B4.Auth.currentProject = "";
      }
      if (replaceOld)
        B4.workspace.clear();
      var r = new FileReader();
      r.onload = function(e) {
        var contents = e.target.result;
        var xml = Blockly.Xml.textToDom(contents);
        Blockly.Xml.domToWorkspace(xml, B4.workspace);
        Blockly.svgResize(B4.workspace);
        clearStlBlocks();
      };
      r.readAsText(f);
      $("#importLocal")[0].value = "";
      $("#loadLocal")[0].value = "";
      if (replaceOld)
        $("#project-name").val(proj_name);
      $("#projectView").addClass("hidden");
      $("#editView").removeClass("hidden");
      if (!B4.offline) $("#bigsavebutton").removeClass("hidden");
      $("#displayBlocks").click();
      window.dispatchEvent(new Event("resize"));
      B4.gProcessor.clearViewer();
    }
  }
  function readStlFile(evt) {
    var f = evt.target.files[0];
    if (f) {
      var r = new FileReader();
      r.onload = function(e) {
        var contents = e.target.result;
        var result = importSTL(contents);
        var src = result[0];
        var center = result[1];
        if (!center) center = "blah";
        var proj_name = f.name.substr(0, f.name.lastIndexOf("(")) || f.name;
        proj_name = proj_name.substr(0, f.name.lastIndexOf(".")) || proj_name;
        proj_name = proj_name.replace(/^\s+|\s+$/g, "");
        var proj_name_use = proj_name;
        var add = 1;
        var found_file = 0;
        while (B4.csg_commands[proj_name_use] && !found_file) {
          if (src != B4.csg_commands[proj_name_use]) {
            proj_name_use = proj_name + "_" + add;
            add++;
          } else found_file = 1;
        }
        B4.csg_commands[proj_name_use] = src;
        if (!found_file)
          B4.csg_filename[proj_name_use] = f.name + ":::";
        else B4.csg_filename[proj_name_use] += f.name + ":::";
        B4.csg_center[proj_name_use] = center;
        var bt_input;
        if (B4.currentInterestingBlock) {
          var fn_input = B4.currentInterestingBlock.getField("STL_FILENAME");
          bt_input = B4.currentInterestingBlock.getField("STL_BUTTON");
          var ct_input = B4.currentInterestingBlock.getField("STL_CONTENTS");
          fn_input.setText(f.name);
          fn_input.setVisible(true);
          bt_input.setVisible(false);
          ct_input.setText(proj_name_use);
          B4.currentInterestingBlock.setCommentText(f.name + "\ncenter:(" + center + ")");
          B4.currentInterestingBlock = null;
        } else {
          var xml = '<xml xmlns="http://blockscad.einsteinsworkshop.com"><block type="stl_import" id="1" x="0" y="0"><field name="STL_FILENAME">' + f.name + '</field><field name="STL_BUTTON">' + B4.Msg.BROWSE + '</field><field name="STL_CONTENTS">' + proj_name_use + "</field></block></xml>";
          var stuff = Blockly.Xml.textToDom(xml);
          var newblock = Blockly.Xml.domToBlock(B4.workspace, stuff.firstChild);
          newblock.moveBy(
            20 + B4.workspace.getMetrics().viewLeft / B4.workspace.scale,
            20 + B4.workspace.getMetrics().viewTop / B4.workspace.scale
          );
          bt_input = newblock.getField("STL_BUTTON");
          bt_input.setVisible(false);
          newblock.setCommentText(f.name + "\ncenter:(" + center + ")");
          newblock.render();
        }
      };
      r.readAsBinaryString(f);
      $("#importStl")[0].value = "";
      $("#displayBlocks").click();
    } else {
      alert("Failed to load file");
    }
  }
  function showExample(e) {
    var example = "examples/" + e.data.msg;
    var name = e.data.msg.split(".")[0];
    if (B4.needToSave) {
      window.promptForSave().then(function(wantToSave) {
        if (wantToSave == "cancel") {
          return;
        }
        if (wantToSave == "nosave")
          B4.setSaveNeeded();
        else if (wantToSave == "save")
          B4.saveBlocks();
        getExample(example, name);
      }).catch(function(result) {
        console.log("caught an error in show example 1.  result is:" + result);
      });
    } else {
      getExample(example, name);
    }
  }
  function getExample(example, name) {
    $.get(example, function(data) {
      B4.clearProject();
      var xmlString;
      if (window.ActiveXObject) {
        xmlString = data.xml;
      } else {
        xmlString = new XMLSerializer().serializeToString(data);
      }
      var xml = Blockly.Xml.textToDom(xmlString);
      Blockly.Xml.domToWorkspace(xml, B4.workspace);
      Blockly.svgResize(B4.workspace);
      $("#project-name").val(name + " example");
      setTimeout(B4.setSaveNeeded, 300);
    });
  }
  function clearStlBlocks() {
    var blocks = B4.workspace.getAllBlocks();
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type == "stl_import") {
        var browse_button = blocks[i].getField("STL_BUTTON");
        blocks[i].getField("STL_CONTENTS").setText("");
        blocks[i].getField("STL_FILENAME").setText("");
        var cText = blocks[i].getCommentText();
        if (!cText.match(/^RELOAD/)) cText = "RELOAD: " + cText;
        blocks[i].setCommentText(cText);
        browse_button.setText("Reload");
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
        $("#error-message").html(B4.Msg.WARNING_RELOAD_STL);
      }
    }
  }
  function saveBlocksLocal() {
    var xmlDom = Blockly.Xml.workspaceToDom(B4.workspace);
    var xmlText = Blockly.Xml.domToText(xmlDom);
    var blob = new Blob([xmlText], { type: "text/plain;charset=utf-8" });
    var blocks_filename = $("#project-name").val();
    if (blocks_filename) {
      saveAs(blob, blocks_filename + ".xml");
      B4.setSaveNeeded();
    } else {
      alert(B4.Msg.SAVE_FAILED + "!\n" + B4.Msg.SAVE_FAILED_PROJECT_NAME);
    }
  }
  function savePicLocal(pic) {
    var blob = new Blob([pic], { type: "img/jpeg" });
    saveAs(blob, "tryThis.jpg");
  }
  function saveOpenscadLocal() {
    var preCode = Blockly.OpenSCAD.workspaceToCode(B4.workspace);
    var code = B4.processCodeForOutput(preCode);
    var blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    var blocks_filename = $("#project-name").val();
    if (blocks_filename) {
      saveAs(blob, blocks_filename + ".scad");
    } else {
      alert("SAVE FAILED.  Please give your project a name, then try again.");
    }
  }

  // blockscad/src/typing.js
  var B5 = window.Blockscad;
  function typeWorkspace() {
    var blocks = B5.workspace.getAllBlocks();
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type == "variables_set")
        assignVarTypes(blocks[i]);
    }
    var topBlocks = B5.workspace.getTopBlocks();
    for (var i = 0; i < topBlocks.length; i++) {
      if (topBlocks[i].category && topBlocks[i].category == "PROCEDURE") {
        assignBlockTypes([topBlocks[i]]);
      }
    }
    for (var k = 0; k < blocks.length; k++) {
      if (blocks[k].type != "variables_set" && blocks[k].category != "PROCEDURE") {
        assignBlockTypes(blocks[k]);
      }
    }
    assignBlockTypes(B5.workspace.getTopBlocks());
  }
  function typeNewStack(block) {
    var topBlock = block.getRootBlock();
    var blockStack = topBlock.getDescendants();
    for (var i = 0; blockStack && i < blockStack.length; i++) {
      if (blockStack[i].type == "variables_set" || blockStack[i].type == "variables_get")
        assignVarTypes(blockStack[i]);
    }
    for (var i = 0; blockStack && i < blockStack.length; i++) {
      if (blockStack[i].category == "PROCEDURE") {
        assignBlockTypes([blockStack[i]]);
      }
    }
    for (var i = 0; blockStack && i < blockStack.length; i++) {
      if (blockStack[i].category == "SET_OP" || blockStack[i].category == "TRANSFORM" || blockStack[i].category == "LOOP") {
        assignBlockTypes([blockStack[i]]);
      }
    }
  }
  function getExtraRootBlock(old, current) {
    var gotOne = 0;
    if (old.length > current.length) {
      for (var i = 0; i < old.length; i++) {
        gotOne = 0;
        for (var j = 0; j < current.length; j++) {
          if (old[i].getAttribute("id") == current[j].id) {
            gotOne = 1;
            break;
          }
        }
        if (!gotOne)
          return i;
      }
    } else {
      for (var i = 0; i < current.length; i++) {
        gotOne = 0;
        for (var j = 0; j < old.length; j++) {
          if (current[i].id == old[j].getAttribute("id")) {
            gotOne = 1;
            break;
          }
        }
        if (!gotOne)
          return i;
      }
    }
    return 0;
  }
  function getBlockFromId(id, blocks) {
    for (var i = 0, block; block = blocks[i]; i++) {
      if (block.id == id) {
        return block;
      }
    }
    return null;
  }
  function aCallerBlock(block, callers) {
    for (var i = 0; i < callers.length; i++)
      if (block == callers[i]) return true;
    return false;
  }
  function findBlockType(block, callers) {
    var topBlock = block.getRootBlock();
    var blockStack = topBlock.getDescendants();
    var foundCSG = 0;
    var foundCAG = 0;
    for (var j = 0; j < blockStack.length; j++) {
      if (!aCallerBlock(blockStack[j], callers) && blockStack[j].category) {
        var cat = blockStack[j].category;
        if (cat == "PRIMITIVE_CSG" || cat == "EXTRUDE" || cat == "COLOR") {
          foundCSG = 1;
          break;
        }
        if (cat == "PRIMITIVE_CAG") foundCAG = 1;
      }
    }
    if (foundCSG) {
      if (hasExtrudeParent(block))
        return "CAG";
      else return "CSG";
    } else if (foundCAG) {
      return "CAG";
    }
    return "EITHER";
  }
  function hasParentOfType(block, type) {
    if (!block)
      return null;
    var parent = block.getParent();
    while (parent) {
      if (parent.type == type)
        return parent;
      parent = parent.getParent();
    }
    return null;
  }
  function doVariableHack(block) {
    if (!block)
      return null;
    var parent = block.getParent();
    while (parent) {
      if (parent.category == "LOOP" || parent.category == "TRANSFORM" || parent.category == "EXTRUDE" || parent.category == "SET_OP" || parent.category == "COLOR" || parent.type == "controls_if") {
        return true;
      }
      parent = parent.getParent();
    }
    return false;
  }
  function stackIsShape(block) {
    var blockStack = block.getDescendants();
    for (var i = 0; i < blockStack.length; i++) {
      var blk = blockStack[i];
      if ((blk.category == "PRIMITIVE_CSG" || blk.category == "PRIMITIVE_CAG") && !blk.hasDisabledParent())
        return true;
    }
    return false;
  }
  function assignVarTypes(blk, name_change) {
    setTimeout(function() {
      if (blk && blk.type == "variables_get") {
        var instances = Blockly.Variables.getInstances(blk.getFieldValue("VAR"), B5.workspace);
        var found_it = 0;
        for (var i = 0; i < instances.length; i++) {
          if (instances[i].type == "variables_set") {
            blk.outputConnection.setCheck(instances[i].myType_);
            found_it = 1;
            break;
          }
          if (instances[i].type == "controls_for" || instances[i].type == "controls_for_chainhull") {
            blk.outputConnection.setCheck(null);
            found_it = 1;
            break;
          }
        }
        if (!found_it) {
          blk.outputConnection.setCheck(null);
        }
        var parent = blk.getParent();
        if (parent && parent.type == "variables_set") {
          assignVarTypes(parent);
        }
      } else if (blk && blk.type == "variables_set") {
        var children = blk.getChildren();
        if (children.length == 0)
          blk.setType(null);
        else {
          var found_one = 0;
          var type = null;
          for (var i = 0; i < children.length; i++) {
            if (children[i].outputConnection) {
              var childType = children[i].outputConnection.check_;
              if (name_change)
                blk.myType_ = "FALSE";
              blk.setType(childType);
              found_one = 1;
            }
          }
          if (found_one == 0)
            blk.setType(null);
        }
      }
    }, 0);
  }
  function handleWorkspaceEvents(event) {
    if (event.type == Blockly.Events.UI) {
      return;
    }
    if (event.type == Blockly.Events.CREATE || event.type == Blockly.Events.DELETE) {
      B5.setSaveNeeded(true);
      var block = B5.workspace.getBlockById(event.ids[0]);
      if (block && block.workspace && !block.workspace.isFlyout) {
        if (block.type == "procedures_callnoreturn" || block.type == "procedures_callreturn")
          block.setType();
      }
    } else if (event.type == Blockly.Events.CHANGE) {
      B5.setSaveNeeded(true);
      if (event.element == "field" && event.name == "VAR") {
        var oldName = event.oldValue;
        var block = B5.workspace.getBlockById(event.blockId);
        if (block && block.type == "variables_set") {
          var instances = Blockly.Variables.getInstances(oldName, B5.workspace);
          var found_it = 0;
          for (var k = 0; instances && k < instances.length; k++) {
            if (instances[k].type == "variables_set")
              assignVarTypes(instances[k], true);
            found_it = 1;
          }
          if (!found_it) {
            for (var k = 0; instances && k < instances.length; k++) {
              if (instances[k].type == "variables_get")
                assignVarTypes(instances[k], true);
            }
          }
        }
        assignVarTypes(block, true);
      }
      if (event.element == "field" && event.name == "NUM") {
        var block = B5.workspace.getBlockById(event.blockId);
        var parent = block.getParent();
        if (parent && parent.type == "cylinder")
          parent.updateRadii();
      }
    } else if (event.type == Blockly.Events.MOVE) {
      if (event.oldParentId) {
        var block = B5.workspace.getBlockById(event.blockId);
        var oldParent = B5.workspace.getBlockById(event.oldParentId);
        assignBlockTypes([block]);
        assignBlockTypes([oldParent]);
        if (block && block.type == "variables_set")
          assignVarTypes(block);
        else if (oldParent && oldParent.type == "variables_set")
          assignVarTypes(oldParent);
      } else if (event.newParentId) {
        var block = B5.workspace.getBlockById(event.blockId);
        var newParent = B5.workspace.getBlockById(event.newParentId);
        assignBlockTypes([block]);
        if (newParent && newParent.type == "variables_set")
          assignVarTypes(newParent);
      }
      if (event.oldParentId || event.newParentId) {
        B5.setSaveNeeded(true);
      }
    }
  }
  function assignBlockTypes(blocks) {
    if (!Array.isArray(blocks))
      blocks = [blocks];
    setTimeout(function() {
      for (var i = 0; blocks && blocks[i] && i < blocks.length; i++) {
        var topBlock = blocks[i].getRootBlock();
        var blockStack = topBlock.getDescendants();
        var foundCSG = 0;
        var foundCAG = 0;
        for (var j = 0; j < blockStack.length; j++) {
          if (blockStack[j].category) {
            var cat = blockStack[j].category;
            if (cat == "PRIMITIVE_CSG" || cat == "EXTRUDE" || cat == "COLOR") {
              foundCSG = 1;
              break;
            }
            if (cat == "PRIMITIVE_CAG") foundCAG = 1;
          }
        }
        for (j = 0; j < blockStack.length; j++) {
          if (blockStack[j].category) {
            if (blockStack[j].category == "TRANSFORM" || blockStack[j].category == "SET_OP" || blockStack[j].category == "PROCEDURE" || blockStack[j].category == "LOOP") {
              var drawMe = !blockStack[j].collapsedParents();
              if (foundCSG) {
                if (hasExtrudeParent(blockStack[j]))
                  blockStack[j].setType(["CAG"], drawMe);
                else blockStack[j].setType(["CSG"], drawMe);
              } else if (foundCAG) {
                blockStack[j].setType(["CAG"], drawMe);
              } else blockStack[j].setType(["CSG", "CAG"], drawMe);
            }
          }
        }
      }
    }, 0);
  }
  function hasExtrudeParent(block) {
    do {
      if (block.category == "EXTRUDE")
        return true;
      block = block.getParent();
    } while (block);
    return false;
  }
  function executeAfterDrag_(action, thisArg) {
    B5.renderActions.push({ action, thisArg });
    if (B5.renderActions.length === 1) {
      var functId = window.setInterval(function() {
        if (!Blockly.dragMode_) {
          while (B5.renderActions.length > 0) {
            var actionItem = B5.renderActions.shift();
            actionItem.action.call(actionItem.thisArg);
          }
          window.clearInterval(functId);
        }
      }, 10);
    }
  }
  function arraysEqual(arr1, arr2) {
    if (arr1 == null && arr2 == null)
      return true;
    if (!arr1 || !arr2)
      return false;
    if (arr1.length !== arr2.length)
      return false;
    for (var i = arr1.length; i--; ) {
      if (arr1[i] !== arr2[i])
        return false;
    }
    return true;
  }

  // blockscad/src/rendering.js
  var B6 = window.Blockscad;
  function mixes2and3D() {
    var topBlocks = [];
    topBlocks = B6.workspace.getTopBlocks();
    var hasCSG = 0;
    var hasCAG = 0;
    var hasUnknown = 0;
    var hasShape = 0;
    for (var i = 0; i < topBlocks.length; i++) {
      if (B6.stackIsShape(topBlocks[i])) {
        hasShape = 1;
        var cat = topBlocks[i].category;
        var mytype;
        if (cat == "PRIMITIVE_CSG") hasCSG++;
        if (cat == "PRIMITIVE_CAG") hasCAG++;
        if (cat == "TRANSFORM" || cat == "SET_OP") {
          mytype = topBlocks[i].getInput("A").connection.check_;
          if (mytype.length == 1 && mytype[0] == "CSG") hasCSG++;
          if (mytype.length == 1 && mytype[0] == "CAG") hasCAG++;
        }
        if (cat == "LOOP") {
          mytype = topBlocks[i].getInput("DO").connection.check_;
          if (mytype.length == 1 && mytype[0] == "CSG") hasCSG++;
          if (mytype.length == 1 && mytype[0] == "CAG") hasCAG++;
        }
        if (cat == "COLOR") hasCSG++;
        if (cat == "EXTRUDE") hasCSG++;
        if (topBlocks[i].type == "controls_if") hasUnknown++;
      }
    }
    if (hasShape && !(hasCSG + hasCAG + hasUnknown)) {
      B6.assignBlockTypes(B6.workspace.getTopBlocks());
    }
    return [hasCSG && hasCAG, hasShape];
  }
  function doRender() {
    $("#error-message").html("");
    $("#error-message").removeClass("has-error");
    $("#renderButton").prop("disabled", true);
    B6.gProcessor.clearViewer();
    var mixes = mixes2and3D();
    if (mixes[1] === 0) {
      $("#error-message").html(B6.Msg.ERROR_MESSAGE + ": " + B6.Msg.RENDER_ERROR_EMPTY);
      $("#error-message").addClass("has-error");
      $("#renderButton").prop("disabled", false);
      return;
    }
    if (mixes[0]) {
      $("#error-message").html(B6.Msg.ERROR_MESSAGE + ": " + B6.Msg.RENDER_ERROR_MIXED);
      $("#error-message").addClass("has-error");
      $("#renderButton").prop("disabled", false);
      return;
    }
    B6.missingFields = [];
    B6.illegalValue = [];
    var code = Blockly.OpenSCAD.workspaceToCode(B6.workspace);
    var gotErr = false;
    var others, blk;
    if (B6.missingFields.length > 0) {
      for (var i = 0; i < B6.missingFields.length; i++) {
        blk = B6.workspace.getBlockById(B6.missingFields[i]);
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
    if (B6.illegalValue.length > 0) {
      for (var i = 0; i < B6.illegalValue.length; i++) {
        blk = B6.workspace.getBlockById(B6.illegalValue[i]);
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
      var errText = "";
      var error = "";
      if (B6.missingFields.length) {
        error = B6.Msg.ERROR_MESSAGE + ": " + B6.Msg.PARSING_ERROR_MISSING_FIELDS;
        errText = error.replace("%1", B6.missingFields.length + " ");
      }
      if (B6.missingFields.length && B6.illegalValue.length)
        errText += "<br>";
      if (B6.illegalValue.length) {
        error = B6.Msg.ERROR_MESSAGE + ": " + B6.Msg.PARSING_ERROR_ILLEGAL_VALUE;
        errText += error.replace("%1", B6.illegalValue.length + " ");
      }
      $("#error-message").html(errText);
      $("#error-message").addClass("has-error");
      $("#renderButton").prop("disabled", false);
      return;
    }
    B6.resolution = $('input[name="resolution"]:checked').val();
    B6.loadTheseFonts = B6.whichFonts(code);
    $("#renderButton").html("working");
    if (B6.loadTheseFonts.length > 0) {
      B6.numloaded = 0;
      for (var i = 0; i < B6.loadTheseFonts.length; i++) {
        B6.loadFontThenRender(i, code);
      }
    } else {
      renderCode(code);
    }
  }
  function renderCode(code) {
    B6.gProcessor.setBlockscad(code);
  }
  function resetView() {
    if (B6.gProcessor != null) {
      if (B6.gProcessor.viewer) {
        B6.gProcessor.viewer.viewReset();
      }
    }
  }
  function processCodeForOutput(code) {
    var re0 = /( *)assign\((\$fn=.+)\){(.+)/g;
    var output0 = code.replace(re0, "$1{\n$1  $2; $3");
    var re = /( *)assign\((.+)\){/gm;
    var output = output0.replace(re, "$1$2;");
    var re2 = /(\w+ = \w+),/g;
    var output2 = output.replace(re2, "$1;  ");
    var re3 = /.+end assign\n/g;
    var output3 = output2.replace(re3, "");
    var output4 = output3.replace(/\n\s*\n\s*\n/g, "\n\n");
    var output5 = output4.replace(/group\(\)\{/g, "union(){");
    return output5;
  }

  // blockscad/src/code-output.js
  function returnIfVarCode(block) {
    if (block.type != "controls_if") return;
    var bays = [];
    var bayIndex = 0;
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].name.match(/DO./) || block.inputList[i].name == "ELSE") {
        var b = block.getInputTargetBlock(block.inputList[i].name);
        bays[bayIndex] = [];
        if (b && b.type == "variables_set")
          bays[bayIndex] = Blockly.OpenSCAD.getVariableCode(b);
        bayIndex++;
      }
    }
    var aC = [];
    var aP = [];
    for (var j = 0; j < bays.length; j++) {
      var assignments = bays[j];
      aC[j] = "";
      aP[j] = "";
      if (assignments.length) {
        aC[j] += "  assign(";
        for (var i = 0; i < assignments.length; i++) {
          aC[j] += assignments[i] + ",";
        }
        aC[j] = aC[j].slice(0, -1);
        aC[j] += "){\n";
        aP[j] = "  }//end assign\n";
      }
    }
    return [aC, aP];
  }

  // blockscad/src/toolbox/color-schemes.js
  var colorSchemes = {
    one: [
      // classic
      "#006205",
      // 3D
      "#209303",
      // 2D
      "#26549E",
      // Transform
      "#7450E2",
      // Set Ops
      "#0185E1",
      // Math
      "#BF6920",
      // Logic
      "#612485",
      // Loops
      "#727272",
      // Text
      "#8C7149",
      // Variables
      "#900355"
      // Modules
    ],
    two: [
      // pale
      "#885ee3",
      // 3D
      "#82af5a",
      // 2D
      "#23901c",
      // Transform
      "#377eb8",
      // Set Ops
      "#ba9969",
      // Math
      "#afaf13",
      // Logic
      "#a66658",
      // Loops
      "#d761bf",
      // Text
      "#999999",
      // Variables
      "#b02375"
      // Modules
    ]
  };
  var allCatNames = [
    "HEX_3D_PRIMITIVE",
    "HEX_2D_PRIMITIVE",
    "HEX_TRANSFORM",
    "HEX_SETOP",
    "HEX_MATH",
    "HEX_LOGIC",
    "HEX_LOOP",
    "HEX_TEXT",
    "HEX_VARIABLE",
    "HEX_PROCEDURE"
  ];
  var simpleCatIndices = [0, 2, 3, 4, 7, 8, 9];

  // blockscad/src/toolbox/block-defs.js
  var blocks3D = [
    { type: "sphere", values: { RAD: { shadow: "math_number", default: "10" } } },
    { type: "cube", values: {
      XVAL: { shadow: "math_number", default: "10" },
      YVAL: { shadow: "math_number", default: "10" },
      ZVAL: { shadow: "math_number", default: "10" }
    } },
    { type: "cylinder", values: {
      RAD1: { shadow: "math_number", default: "10" },
      RAD2: { shadow: "math_number", default: "10" },
      HEIGHT: { shadow: "math_number", default: "10" }
    } },
    { type: "torus", advancedOnly: true, values: {
      RAD1: { shadow: "math_number", default: "4" },
      RAD2: { shadow: "math_number", default: "1" },
      SIDES: { shadow: "math_number", default: "8" },
      FACES: { shadow: "math_number", default: "16" }
    } }
  ];
  var blocks2D = [
    { type: "circle", values: { RAD: { shadow: "math_number", default: "10" } } },
    { type: "square", values: {
      XVAL: { shadow: "math_number", default: "10" },
      YVAL: { shadow: "math_number", default: "10" }
    } }
  ];
  var blocksTransform = [
    { type: "translate", values: {
      XVAL: { shadow: "math_number", default: "0" },
      YVAL: { shadow: "math_number", default: "0" },
      ZVAL: { shadow: "math_number", default: "0" }
    } },
    { type: "simplerotate", values: {
      XVAL: { shadow: "math_angle", default: "0" },
      YVAL: { shadow: "math_angle", default: "0" },
      ZVAL: { shadow: "math_angle", default: "0" }
    } },
    { type: "simplemirror_new", advancedOnly: true },
    { type: "scale", values: {
      XVAL: { shadow: "math_number", default: "1" },
      YVAL: { shadow: "math_number", default: "1" },
      ZVAL: { shadow: "math_number", default: "1" }
    } },
    { type: "color", values: {
      COLOR: { shadow: "colour_picker", field: "COLOUR", default: "#ffcc00" }
    } },
    { type: "color_rgb", advancedOnly: true, values: {
      RED: { shadow: "math_number", default: "100" },
      GREEN: { shadow: "math_number", default: "100" },
      BLUE: { shadow: "math_number", default: "100" }
    } },
    { type: "$fn", values: {
      SIDES: { shadow: "math_number", default: "8" }
    } },
    { type: "taper", advancedOnly: true, values: {
      FACTOR: { shadow: "math_number", default: "1" }
    } },
    { type: "linearextrude", advancedOnly: true, values: {
      HEIGHT: { shadow: "math_number", default: "10" },
      TWIST: { shadow: "math_angle", default: "0" },
      XSCALE: { shadow: "math_number", default: "1" },
      YSCALE: { shadow: "math_number", default: "1" }
    } },
    { type: "rotateextrude", advancedOnly: true, values: {
      FACES: { shadow: "math_number", default: "5" }
    } },
    { type: "fancyrotate", advancedOnly: true, values: {
      AVAL: { shadow: "math_angle", default: "0" },
      XVAL: { shadow: "math_number", default: "0" },
      YVAL: { shadow: "math_number", default: "0" },
      ZVAL: { shadow: "math_number", default: "0" }
    } },
    { type: "fancymirror", advancedOnly: true, values: {
      XVAL: { shadow: "math_number", default: "1" },
      YVAL: { shadow: "math_number", default: "1" },
      ZVAL: { shadow: "math_number", default: "1" }
    } }
  ];
  var blocksSetOps = [
    { type: "union" },
    { type: "difference" },
    { type: "intersection" },
    { type: "hull", advancedOnly: true }
  ];
  var blocksMath = [
    { type: "math_number" },
    { type: "math_angle", advancedOnly: true },
    { type: "math_arithmetic", values: {
      A: { shadow: "math_number", default: "1" },
      B: { shadow: "math_number", default: "1" }
    } },
    { type: "math_single", values: {
      NUM: { shadow: "math_number", default: "9" }
    }, advancedOnly: true },
    { type: "math_trig", advancedOnly: true, values: {
      NUM: { shadow: "math_number", default: "45" }
    } },
    { type: "math_constant_bs", advancedOnly: true },
    { type: "math_number_property", advancedOnly: true, values: {
      NUMBER_TO_CHECK: { shadow: "math_number", default: "0" }
    } },
    { type: "math_round", advancedOnly: true, values: {
      NUM: { shadow: "math_number", default: "3.1" }
    } },
    { type: "math_modulo", advancedOnly: true, values: {
      DIVIDEND: { shadow: "math_number", default: "64" },
      DIVISOR: { shadow: "math_number", default: "10" }
    } },
    { type: "math_constrain", advancedOnly: true, values: {
      VALUE: { shadow: "math_number", default: "50" },
      LOW: { shadow: "math_number", default: "1" },
      HIGH: { shadow: "math_number", default: "100" }
    } },
    { type: "math_random_int", values: {
      FROM: { shadow: "math_number", default: "1" },
      TO: { shadow: "math_number", default: "100" }
    } },
    { type: "math_random_float", advancedOnly: true }
  ];
  var blocksLogic = [
    { type: "controls_if", advancedOnly: true },
    { type: "logic_compare", advancedOnly: true },
    { type: "logic_operation", advancedOnly: true },
    { type: "logic_negate", advancedOnly: true },
    { type: "logic_boolean", advancedOnly: true },
    { type: "logic_ternary", advancedOnly: true }
  ];
  var blocksLoops = [
    { type: "controls_for", advancedOnly: true, values: {
      FROM: { shadow: "math_number", default: "1" },
      TO: { shadow: "math_number", default: "10" },
      BY: { shadow: "math_number", default: "1" }
    } }
  ];
  var blocksText = [
    { type: "bs_text", advancedOnly: true, values: {
      TEXT: { shadow: "text", default: "" },
      SIZE: { shadow: "math_number", default: "10" }
    } },
    { type: "bs_3dtext", values: {
      TEXT: { shadow: "text", default: "" },
      SIZE: { shadow: "math_number", default: "10" },
      THICKNESS: { shadow: "math_number", default: "2" }
    } },
    { type: "text", advancedOnly: true },
    { type: "bs_text_length", advancedOnly: true, values: {
      VALUE: { shadow: "text", field: "TEXT", default: "abc" }
    } }
  ];

  // blockscad/src/toolbox/xml-builder.js
  function blockToXml(blockDef) {
    var xml = '<block type="' + blockDef.type + '">';
    if (blockDef.values) {
      var keys = Object.keys(blockDef.values);
      for (var i = 0; i < keys.length; i++) {
        var name = keys[i];
        var val = blockDef.values[name];
        xml += '<value name="' + name + '">';
        xml += '<shadow type="' + val.shadow + '">';
        var fieldName = val.field || defaultFieldName(val.shadow);
        if (val.default !== void 0 && val.default !== "") {
          xml += '<field name="' + fieldName + '">' + val.default + "</field>";
        }
        xml += "</shadow>";
        xml += "</value>";
      }
    }
    xml += "</block>";
    return xml;
  }
  function defaultFieldName(shadowType) {
    if (shadowType === "colour_picker") return "COLOUR";
    if (shadowType === "text") return "TEXT";
    return "NUM";
  }
  function categoryToXml(name, blocks, isSimple) {
    var filtered = blocks;
    if (isSimple) {
      filtered = blocks.filter(function(b) {
        return !b.advancedOnly;
      });
    }
    if (filtered.length === 0) return "";
    var xml = '<category name="' + name + '">';
    for (var i = 0; i < filtered.length; i++) {
      xml += blockToXml(filtered[i]);
    }
    xml += "</category>";
    return xml;
  }
  function customCategoryToXml(name, customAttr) {
    return '<category name="' + name + '" custom="' + customAttr + '"></category>';
  }

  // blockscad/src/toolbox/index.js
  var T = window.Blockscad.Toolbox;
  var Msg = window.Blockscad.Msg;
  function createToolbox() {
    Msg = window.Blockscad.Msg;
    T = window.Blockscad.Toolbox;
    var adv = '<xml id="toolbox" style="display: none">';
    adv += categoryToXml(Msg.CATEGORY_3D_SHAPES, blocks3D, false);
    adv += categoryToXml(Msg.CATEGORY_2D_SHAPES, blocks2D, false);
    adv += categoryToXml(Msg.CATEGORY_TRANSFORMATIONS, blocksTransform, false);
    adv += categoryToXml(Msg.CATEGORY_SET_OPERATIONS, blocksSetOps, false);
    adv += categoryToXml(Msg.CATEGORY_MATH, blocksMath, false);
    adv += categoryToXml(Msg.CATEGORY_LOGIC, blocksLogic, false);
    adv += categoryToXml(Msg.CATEGORY_LOOPS, blocksLoops, false);
    adv += categoryToXml(Msg.CATEGORY_TEXT, blocksText, false);
    adv += customCategoryToXml(Msg.CATEGORY_VARIBLES, "VARIABLE");
    adv += customCategoryToXml(Msg.CATEGORY_PROCEDURES, "PROCEDURE");
    adv += "</xml>";
    var sim = '<xml id="toolbox" style="display: none">';
    sim += categoryToXml(Msg.CATEGORY_3D_SHAPES, blocks3D, true);
    sim += categoryToXml(Msg.CATEGORY_TRANSFORMATIONS, blocksTransform, true);
    sim += categoryToXml(Msg.CATEGORY_SET_OPERATIONS, blocksSetOps, true);
    sim += categoryToXml(Msg.CATEGORY_MATH, blocksMath, true);
    sim += categoryToXml(Msg.CATEGORY_TEXT, blocksText, true);
    sim += customCategoryToXml(Msg.CATEGORY_VARIBLES, "VARIABLE");
    sim += customCategoryToXml(Msg.CATEGORY_PROCEDURES, "PROCEDURE");
    sim += "</xml>";
    T.adv = adv;
    T.sim = sim;
    T.allcats = allCatNames;
    T.whichCatsInSimple = simpleCatIndices;
    T.colorScheme = colorSchemes;
    T.catHex = [];
    T.simpCatHex = [];
  }
  function setColorScheme(color_scheme) {
    T = window.Blockscad.Toolbox;
    for (var i = 0; i < T.allcats.length; i++) {
      T[T.allcats[i]] = color_scheme[i];
      T.catHex[i] = color_scheme[i];
    }
  }
  function setCatColors() {
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

  // blockscad/src/main-entry.js
  var B7 = window.Blockscad;
  B7.version = VERSION;
  B7.releaseDate = RELEASE_DATE;
  B7.picSize = PIC_SIZE;
  B7.rpicSize = RPIC_SIZE;
  B7.picQuality = PIC_QUALITY;
  B7.numRotPics = NUM_ROT_PICS;
  B7.resolution = DEFAULT_RESOLUTION;
  B7.initDarkMode = initDarkMode;
  B7.toggleDarkMode = toggleDarkMode;
  B7.applyDarkMode = applyDarkMode;
  B7.takeRPic = takeRPic;
  B7.takePic = takePic;
  B7.cameraPic = cameraPic;
  B7.savePic = savePic;
  B7.newProject = newProject;
  B7.createNewProject = createNewProject;
  B7.clearProject = clearProject;
  B7.discard = discard;
  B7.setSaveNeeded = setSaveNeeded;
  B7.saveBlocks = saveBlocks;
  B7.saveBlocksLocal = saveBlocksLocal;
  B7.saveOpenscadLocal = saveOpenscadLocal;
  B7.loadLocalBlocks = loadLocalBlocks;
  B7.readStlFile = readStlFile;
  B7.showExample = showExample;
  B7.getExample = getExample;
  B7.clearStlBlocks = clearStlBlocks;
  B7.savePicLocal = savePicLocal;
  window.readSingleFile = readSingleFile;
  B7.typeWorkspace = typeWorkspace;
  B7.typeNewStack = typeNewStack;
  B7.assignBlockTypes = assignBlockTypes;
  B7.assignVarTypes = assignVarTypes;
  B7.handleWorkspaceEvents = handleWorkspaceEvents;
  B7.getExtraRootBlock = getExtraRootBlock;
  B7.getBlockFromId = getBlockFromId;
  B7.findBlockType = findBlockType;
  B7.hasParentOfType = hasParentOfType;
  B7.doVariableHack = doVariableHack;
  B7.stackIsShape = stackIsShape;
  B7.hasExtrudeParent = hasExtrudeParent;
  B7.executeAfterDrag_ = executeAfterDrag_;
  B7.arraysEqual = arraysEqual;
  B7.doRender = doRender;
  B7.renderCode = renderCode;
  B7.mixes2and3D = mixes2and3D;
  B7.processCodeForOutput = processCodeForOutput;
  B7.resetView = resetView;
  window.Blockly.OpenSCAD.returnIfVarCode = returnIfVarCode;
  B7.Toolbox.createToolbox = createToolbox;
  B7.Toolbox.setColorScheme = setColorScheme;
  B7.Toolbox.setCatColors = setCatColors;
  window.promptForSave = promptForSave;
  console.log("[BlocksCAD] Module system loaded (v" + VERSION + ")");
})();
