// Project management functionality
// Extracted from blockscad.js lines ~927-1002, 1071-1183

const B = window.Blockscad;

export function newProject() {
  $('#displayBlocks').click();
  if (B.needToSave) {
    promptForSave().then(function(wantToSave) {
      if (wantToSave=="cancel") {
        return;
      }
      if (wantToSave=="nosave")
        setSaveNeeded();
      else if (wantToSave=="save")
        saveBlocks();

      createNewProject();
    }).catch(function(result) {
      console.log("caught an error in new project.  result is:" + result);
    });
  }
  else {
    createNewProject();
  }
}

export function createNewProject() {
  clearProject();
  B.workspace.clearUndo();
  setTimeout(setSaveNeeded, 300);
  $('#displayBlocks').click();
  if (!B.offline)
    $('#bigsavebutton').removeClass('hidden');
}

export function promptForSave() {
  var message = '<h4>' + B.Msg.SAVE_PROMPT + '</h4>';
  return new Promise(function(resolve, reject) {
    bootbox.dialog({
      message: message,
      backdrop: true,
      size: "small",
      buttons: {
        save: {
          label: B.Msg.SAVE_PROMPT_YES,
          className: "btn-default btn-lg primary pull-right giant-yes",
          callback: function(result) {
            resolve("save");
          }
        },
        dont_save: {
          label: B.Msg.SAVE_PROMPT_NO,
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

export function saveBlocks() {
  if (!B.offline && B.Auth.isLoggedIn) {
    B.Auth.saveBlocksToAccount();
  }
  else {
    B.saveBlocksLocal();
  }
}

export function setSaveNeeded(saveNeeded) {
  if (saveNeeded) {
    B.needToSave = 1;
  }
  else {
    B.needToSave = 0;
  }
}

export function clearProject() {
  if (!B.offline) {
    B.Auth.currentProject = '';
    B.Auth.currentProjectKey = '';
  }
  B.workspace.clear();
  B.gProcessor.clearViewer();

  $('#project-name').val(B.Msg.PROJECT_NAME_DEFAULT);
  $('#projectView').addClass('hidden');
  $('#editView').removeClass('hidden');
  $('#bigsavebutton').removeClass('hidden');
  window.dispatchEvent(new Event('resize'));
}

export function discard() {
  var count = Blockly.mainWorkspace.getAllBlocks().length;
  if (count < 2) {
    Blockly.mainWorkspace.clear();
    window.location.hash = '';
  }
  else {
    var message = B.Msg.DISCARD_ALL.replace("%1", count);
    bootbox.confirm({
      size: "small",
      message: message,
      buttons: {
        confirm: {
          label: B.Msg.CONFIRM_DIALOG_YES,
          className: "btn-default confirm-yes"
        },
        cancel: {
          label: B.Msg.CONFIRM_DIALOG_NO,
          className: "btn-default confirm-yes"
        },
      },
      callback: function(result) {
        if (result) {
          Blockly.mainWorkspace.clear();
          window.location.hash = '';
        }
      }
    });
  }
}
