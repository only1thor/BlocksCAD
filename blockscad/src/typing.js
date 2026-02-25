// Block typing functionality
// Extracted from blockscad.js lines ~523-576, 1400-1786
// Highest-risk extraction - uses setTimeout(fn, 0) for timing

const B = window.Blockscad;

export function typeWorkspace() {
  var blocks = B.workspace.getAllBlocks();
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].type == 'variables_set')
      assignVarTypes(blocks[i]);
  }

  var topBlocks = B.workspace.getTopBlocks();

  for (var i = 0; i < topBlocks.length; i++) {
    if (topBlocks[i].category && topBlocks[i].category == 'PROCEDURE') {
      assignBlockTypes([topBlocks[i]]);
    }
  }

  for (var k = 0; k < blocks.length; k++) {
    if (blocks[k].type != 'variables_set' && blocks[k].category != 'PROCEDURE') {
      assignBlockTypes(blocks[k]);
    }
  }
  assignBlockTypes(B.workspace.getTopBlocks());
}

export function typeNewStack(block) {
  var topBlock = block.getRootBlock();
  var blockStack = topBlock.getDescendants();
  for (var i = 0; blockStack && i < blockStack.length; i++) {
    if (blockStack[i].type == 'variables_set' || blockStack[i].type == 'variables_get')
      assignVarTypes(blockStack[i]);
  }
  for (var i = 0; blockStack && i < blockStack.length; i++) {
    if (blockStack[i].category == 'PROCEDURE') {
      assignBlockTypes([blockStack[i]]);
    }
  }
  for (var i = 0; blockStack && i < blockStack.length; i++) {
    if (blockStack[i].category == 'SET_OP' ||
        blockStack[i].category == 'TRANSFORM' ||
        blockStack[i].category == 'LOOP') {
      assignBlockTypes([blockStack[i]]);
    }
  }
}

export function getExtraRootBlock(old, current) {
  var gotOne = 0;

  if (old.length > current.length) {
    for (var i = 0; i < old.length; i++) {
      gotOne = 0;
      for (var j = 0; j < current.length; j++) {
        if (old[i].getAttribute('id') == current[j].id) {
          gotOne = 1;
          break;
        }
      }
      if (!gotOne)
        return i;
    }
  }
  else {
    for (var i = 0; i < current.length; i++) {
      gotOne = 0;
      for (var j = 0; j < old.length; j++) {
        if (current[i].id == old[j].getAttribute('id')) {
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

export function getBlockFromId(id, blocks) {
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

export function findBlockType(block, callers) {
  var topBlock = block.getRootBlock();
  var blockStack = topBlock.getDescendants();
  var foundCSG = 0;
  var foundCAG = 0;

  for (var j = 0; j < blockStack.length; j++) {
    if (!aCallerBlock(blockStack[j], callers) && blockStack[j].category) {
      var cat = blockStack[j].category;
      if (cat == 'PRIMITIVE_CSG' || cat == 'EXTRUDE' || cat == 'COLOR') {
        foundCSG = 1;
        break;
      }
      if (cat == 'PRIMITIVE_CAG') foundCAG = 1;
    }
  }
  if (foundCSG) {
    if (hasExtrudeParent(block))
      return 'CAG';
    else return 'CSG';
  }
  else if (foundCAG) {
    return('CAG');
  }
  return('EITHER');
}

export function hasParentOfType(block, type) {
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

export function doVariableHack(block) {
  if (!block)
    return null;
  var parent = block.getParent();
  while (parent) {
    if (parent.category == 'LOOP' || parent.category == 'TRANSFORM' || parent.category == 'EXTRUDE'
        || parent.category == 'SET_OP' || parent.category == 'COLOR' || parent.type == 'controls_if') {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}

export function stackIsShape(block) {
  var blockStack = block.getDescendants();
  for (var i = 0; i < blockStack.length; i++) {
    var blk = blockStack[i];
    if ((blk.category == 'PRIMITIVE_CSG' || blk.category == 'PRIMITIVE_CAG') && !blk.hasDisabledParent())
      return true;
  }
  return false;
}

export function assignVarTypes(blk, name_change) {
  setTimeout(function() {
    if (blk && blk.type == "variables_get") {
      var instances = Blockly.Variables.getInstances(blk.getFieldValue('VAR'), B.workspace);
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
    }
    else if (blk && blk.type == "variables_set") {
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

export function handleWorkspaceEvents(event) {
  if (event.type == Blockly.Events.UI) {
    return;
  }
  if (event.type == Blockly.Events.CREATE ||
      event.type == Blockly.Events.DELETE) {
    B.setSaveNeeded(true);

    var block = B.workspace.getBlockById(event.ids[0]);
    if (block && block.workspace && !block.workspace.isFlyout) {
      if (block.type == 'procedures_callnoreturn' || block.type == 'procedures_callreturn')
        block.setType();
    }
  }
  else if (event.type == Blockly.Events.CHANGE) {
    B.setSaveNeeded(true);

    if (event.element == 'field' && event.name == 'VAR') {
      var oldName = event.oldValue;
      var block = B.workspace.getBlockById(event.blockId);

      if (block && block.type == 'variables_set') {
        var instances = Blockly.Variables.getInstances(oldName, B.workspace);
        var found_it = 0;
        for (var k = 0; instances && k < instances.length; k++) {
          if (instances[k].type == 'variables_set')
            assignVarTypes(instances[k], true);
          found_it = 1;
        }
        if (!found_it) {
          for (var k = 0; instances && k < instances.length; k++) {
            if (instances[k].type == 'variables_get')
              assignVarTypes(instances[k], true);
          }
        }
      }
      assignVarTypes(block, true);
    }
    if (event.element == 'field' && event.name == 'NUM') {
      var block = B.workspace.getBlockById(event.blockId);
      var parent = block.getParent();
      if (parent && parent.type == 'cylinder')
        parent.updateRadii();
    }
  }
  else if (event.type == Blockly.Events.MOVE) {
    if (event.oldParentId) {
      var block = B.workspace.getBlockById(event.blockId);
      var oldParent = B.workspace.getBlockById(event.oldParentId);
      assignBlockTypes([block]);
      assignBlockTypes([oldParent]);

      if (block && block.type == 'variables_set')
        assignVarTypes(block);
      else if (oldParent && oldParent.type == 'variables_set')
        assignVarTypes(oldParent);
    }
    else if (event.newParentId) {
      var block = B.workspace.getBlockById(event.blockId);
      var newParent = B.workspace.getBlockById(event.newParentId);
      assignBlockTypes([block]);
      if (newParent && newParent.type == 'variables_set')
        assignVarTypes(newParent);
    }

    if (event.oldParentId || event.newParentId) {
      B.setSaveNeeded(true);
    }
  }
}

export function assignBlockTypes(blocks) {
  if (!goog.isArray(blocks))
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
          if (cat == 'PRIMITIVE_CSG' || cat == 'EXTRUDE' || cat == 'COLOR') {
            foundCSG = 1;
            break;
          }
          if (cat == 'PRIMITIVE_CAG') foundCAG = 1;
        }
      }
      for (j = 0; j < blockStack.length; j++) {
        if (blockStack[j].category)
          if (blockStack[j].category == 'TRANSFORM' ||
              blockStack[j].category == 'SET_OP' ||
              blockStack[j].category == 'PROCEDURE' ||
              blockStack[j].category == 'LOOP') {
            var drawMe = !blockStack[j].collapsedParents();
            if (foundCSG) {
              if (hasExtrudeParent(blockStack[j]))
                blockStack[j].setType(['CAG'], drawMe);
              else blockStack[j].setType(['CSG'], drawMe);
            }
            else if (foundCAG) {
              blockStack[j].setType(['CAG'], drawMe);
            }
            else blockStack[j].setType(['CSG', 'CAG'], drawMe);
          }
      }
    }
  }, 0);
}

export function hasExtrudeParent(block) {
  do {
    if (block.category == 'EXTRUDE')
      return true;
    block = block.parentBlock_;
  } while (block);
  return false;
}

export function executeAfterDrag_(action, thisArg) {
  B.renderActions.push({ action: action, thisArg: thisArg });
  if (B.renderActions.length === 1) {
    var functId = window.setInterval(function() {
      if (!Blockly.dragMode_) {
        while (B.renderActions.length > 0) {
          var actionItem = B.renderActions.shift();
          actionItem.action.call(B.renderActions.thisArg);
        }
        window.clearInterval(functId);
      }
    }, 10);
  }
}

export function arraysEqual(arr1, arr2) {
  if (arr1 == null && arr2 == null)
    return true;
  if (!arr1 || !arr2)
    return false;

  if (arr1.length !== arr2.length)
    return false;
  for (var i = arr1.length; i--;) {
    if (arr1[i] !== arr2[i])
      return false;
  }

  return true;
}
