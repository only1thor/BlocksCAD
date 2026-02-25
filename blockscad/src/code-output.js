// Code output helpers for Blockly.OpenSCAD
// Extracted from blockscad.js lines ~1952-2004

export function returnIfVarCode(block) {
  if (block.type != 'controls_if') return;

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
    aC[j] = '';
    aP[j] = '';
    if (assignments.length) {
      aC[j] += '  assign(';
      for (var i = 0; i < assignments.length; i++) {
        aC[j] += assignments[i] + ',';
      }
      aC[j] = aC[j].slice(0, -1);

      aC[j] += '){\n';
      aP[j] = '  }//end assign\n';
    }
  }

  return [aC, aP];
}
