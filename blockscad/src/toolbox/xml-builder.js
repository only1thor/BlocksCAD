// XML generation from block data objects
// Replaces hand-written XML strings in toolbox.js

export function blockToXml(blockDef) {
  var xml = '<block type="' + blockDef.type + '">';
  if (blockDef.values) {
    var keys = Object.keys(blockDef.values);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var val = blockDef.values[name];
      xml += '<value name="' + name + '">';
      xml += '<shadow type="' + val.shadow + '">';
      // Use field name from definition, or default 'NUM' for math types, 'COLOUR' for colour, 'TEXT' for text
      var fieldName = val.field || defaultFieldName(val.shadow);
      if (val.default !== undefined && val.default !== '') {
        xml += '<field name="' + fieldName + '">' + val.default + '</field>';
      }
      xml += '</shadow>';
      xml += '</value>';
    }
  }
  xml += '</block>';
  return xml;
}

function defaultFieldName(shadowType) {
  if (shadowType === 'colour_picker') return 'COLOUR';
  if (shadowType === 'text') return 'TEXT';
  return 'NUM';
}

export function categoryToXml(name, blocks, isSimple) {
  var filtered = blocks;
  if (isSimple) {
    filtered = blocks.filter(function(b) { return !b.advancedOnly; });
  }
  if (filtered.length === 0) return '';

  var xml = '<category name="' + name + '">';
  for (var i = 0; i < filtered.length; i++) {
    xml += blockToXml(filtered[i]);
  }
  xml += '</category>';
  return xml;
}

export function customCategoryToXml(name, customAttr) {
  return '<category name="' + name + '" custom="' + customAttr + '"></category>';
}
