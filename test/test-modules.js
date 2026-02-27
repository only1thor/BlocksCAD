/**
 * Smoke tests for the new ES modules (toolbox generation, config, block-defs).
 * Uses esbuild to bundle the ES modules into a Node-compatible format,
 * then runs assertions against the bundled output.
 *
 * Run with: node test/test-modules.js
 */
'use strict';

var esbuild = require('esbuild');
var path = require('path');
var fs = require('fs');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(msg);
    console.error('  FAIL: ' + msg);
  }
}

// Bundle the pure modules (no browser globals) into a temp file for testing
var testEntry = path.join(__dirname, '_test-modules-entry.js');
var testBundle = path.join(__dirname, '_test-modules-bundle.js');

fs.writeFileSync(testEntry,
  'export { VERSION, RELEASE_DATE, PIC_SIZE, RPIC_SIZE, PIC_QUALITY, NUM_ROT_PICS, DEFAULT_RESOLUTION } from "../blockscad/src/config.js";\n' +
  'export { blocks3D, blocks2D, blocksTransform, blocksSetOps, blocksMath, blocksLogic, blocksLoops, blocksText } from "../blockscad/src/toolbox/block-defs.js";\n' +
  'export { colorSchemes, allCatNames, simpleCatIndices } from "../blockscad/src/toolbox/color-schemes.js";\n' +
  'export { blockToXml, categoryToXml, customCategoryToXml } from "../blockscad/src/toolbox/xml-builder.js";\n'
);

try {
  var result = esbuild.buildSync({
    entryPoints: [testEntry],
    bundle: true,
    format: 'cjs',
    outfile: testBundle,
    platform: 'node',
    logLevel: 'error',
  });

  var mod = require(testBundle);

  // ============================================================
  // CONFIG
  // ============================================================

  (function testConfig() {
    console.log('--- Config ---');
    assert(typeof mod.VERSION === 'string' && mod.VERSION.length > 0, 'VERSION is a non-empty string');
    assert(typeof mod.RELEASE_DATE === 'string' && mod.RELEASE_DATE.length > 0, 'RELEASE_DATE is a non-empty string');
    assert(Array.isArray(mod.PIC_SIZE) && mod.PIC_SIZE.length === 2, 'PIC_SIZE is a 2-element array');
    assert(Array.isArray(mod.RPIC_SIZE) && mod.RPIC_SIZE.length === 2, 'RPIC_SIZE is a 2-element array');
    assert(typeof mod.PIC_QUALITY === 'number' && mod.PIC_QUALITY > 0 && mod.PIC_QUALITY <= 1, 'PIC_QUALITY is between 0 and 1');
    assert(typeof mod.NUM_ROT_PICS === 'number' && mod.NUM_ROT_PICS > 0, 'NUM_ROT_PICS is positive');
    assert(typeof mod.DEFAULT_RESOLUTION === 'number', 'DEFAULT_RESOLUTION is a number');
  })();

  // ============================================================
  // BLOCK DEFINITIONS
  // ============================================================

  (function testBlockDefs() {
    console.log('--- Block Definitions ---');

    var allBlocks = [
      { name: 'blocks3D', arr: mod.blocks3D },
      { name: 'blocks2D', arr: mod.blocks2D },
      { name: 'blocksTransform', arr: mod.blocksTransform },
      { name: 'blocksSetOps', arr: mod.blocksSetOps },
      { name: 'blocksMath', arr: mod.blocksMath },
      { name: 'blocksLogic', arr: mod.blocksLogic },
      { name: 'blocksLoops', arr: mod.blocksLoops },
      { name: 'blocksText', arr: mod.blocksText },
    ];

    for (var i = 0; i < allBlocks.length; i++) {
      var group = allBlocks[i];
      assert(Array.isArray(group.arr) && group.arr.length > 0, group.name + ' is a non-empty array');

      for (var j = 0; j < group.arr.length; j++) {
        var block = group.arr[j];
        assert(typeof block.type === 'string' && block.type.length > 0,
          group.name + '[' + j + '] has a non-empty type string');

        if (block.values) {
          var keys = Object.keys(block.values);
          for (var k = 0; k < keys.length; k++) {
            var val = block.values[keys[k]];
            assert(typeof val.shadow === 'string' && val.shadow.length > 0,
              group.name + '[' + j + '].values.' + keys[k] + ' has a shadow type');
          }
        }

        if (block.advancedOnly !== undefined) {
          assert(typeof block.advancedOnly === 'boolean',
            group.name + '[' + j + '].advancedOnly is boolean');
        }
      }
    }

    // Specific blocks that must exist
    var block3DTypes = mod.blocks3D.map(function(b) { return b.type; });
    assert(block3DTypes.indexOf('sphere') >= 0, 'blocks3D contains sphere');
    assert(block3DTypes.indexOf('cube') >= 0, 'blocks3D contains cube');
    assert(block3DTypes.indexOf('cylinder') >= 0, 'blocks3D contains cylinder');

    var block2DTypes = mod.blocks2D.map(function(b) { return b.type; });
    assert(block2DTypes.indexOf('circle') >= 0, 'blocks2D contains circle');
    assert(block2DTypes.indexOf('square') >= 0, 'blocks2D contains square');
  })();

  // ============================================================
  // COLOR SCHEMES
  // ============================================================

  (function testColorSchemes() {
    console.log('--- Color Schemes ---');

    assert(typeof mod.colorSchemes === 'object' && mod.colorSchemes !== null, 'colorSchemes is an object');
    assert(Array.isArray(mod.colorSchemes.one) && mod.colorSchemes.one.length === 10, 'colorSchemes.one has 10 colors');
    assert(Array.isArray(mod.colorSchemes.two) && mod.colorSchemes.two.length === 10, 'colorSchemes.two has 10 colors');

    // All colors should be hex strings
    mod.colorSchemes.one.forEach(function(c, i) {
      assert(/^#[0-9a-fA-F]{6}$/.test(c), 'colorSchemes.one[' + i + '] is valid hex color');
    });

    assert(Array.isArray(mod.allCatNames) && mod.allCatNames.length === 10, 'allCatNames has 10 entries');
    assert(Array.isArray(mod.simpleCatIndices), 'simpleCatIndices is an array');

    // simpleCatIndices should all be valid indices into allCatNames
    mod.simpleCatIndices.forEach(function(idx, i) {
      assert(idx >= 0 && idx < mod.allCatNames.length,
        'simpleCatIndices[' + i + '] (' + idx + ') is valid index');
    });
  })();

  // ============================================================
  // XML BUILDER
  // ============================================================

  (function testXmlBuilder() {
    console.log('--- XML Builder ---');

    // blockToXml with a simple block (no values)
    var xml = mod.blockToXml({ type: 'union' });
    assert(xml === '<block type="union"></block>', 'blockToXml for simple block produces correct XML');

    // blockToXml with values
    xml = mod.blockToXml({ type: 'sphere', values: { RAD: { shadow: 'math_number', default: '10' } } });
    assert(xml.indexOf('<block type="sphere">') === 0, 'blockToXml starts with correct block tag');
    assert(xml.indexOf('<value name="RAD">') > 0, 'blockToXml contains value element');
    assert(xml.indexOf('<shadow type="math_number">') > 0, 'blockToXml contains shadow element');
    assert(xml.indexOf('<field name="NUM">10</field>') > 0, 'blockToXml contains field with default value');
    assert(xml.indexOf('</block>') === xml.length - '</block>'.length, 'blockToXml ends with closing tag');

    // blockToXml with custom field name (colour_picker)
    xml = mod.blockToXml({ type: 'color', values: { COLOR: { shadow: 'colour_picker', field: 'COLOUR', default: '#ffcc00' } } });
    assert(xml.indexOf('<field name="COLOUR">#ffcc00</field>') > 0, 'blockToXml uses custom field name');

    // categoryToXml
    var blocks = [
      { type: 'sphere', values: { RAD: { shadow: 'math_number', default: '10' } } },
      { type: 'torus', advancedOnly: true },
    ];
    xml = mod.categoryToXml('3D Shapes', blocks, false);
    assert(xml.indexOf('<category name="3D Shapes">') === 0, 'categoryToXml wraps in category');
    assert(xml.indexOf('sphere') > 0, 'categoryToXml includes sphere');
    assert(xml.indexOf('torus') > 0, 'categoryToXml (advanced mode) includes torus');

    // categoryToXml in simple mode filters advancedOnly
    xml = mod.categoryToXml('3D Shapes', blocks, true);
    assert(xml.indexOf('sphere') > 0, 'categoryToXml (simple mode) includes sphere');
    assert(xml.indexOf('torus') < 0, 'categoryToXml (simple mode) excludes torus');

    // categoryToXml returns empty string if all blocks are advancedOnly in simple mode
    xml = mod.categoryToXml('Logic', [{ type: 'logic_compare', advancedOnly: true }], true);
    assert(xml === '', 'categoryToXml returns empty for all-advancedOnly in simple mode');

    // customCategoryToXml
    xml = mod.customCategoryToXml('Variables', 'VARIABLE');
    assert(xml === '<category name="Variables" custom="VARIABLE"></category>',
      'customCategoryToXml produces correct XML');
  })();

  // ============================================================
  // TOOLBOX GENERATION — end-to-end
  // ============================================================

  (function testToolboxEndToEnd() {
    console.log('--- Toolbox Generation (end-to-end) ---');

    // Build a full advanced toolbox from the real block definitions
    var adv = '<xml id="toolbox" style="display: none">';
    adv += mod.categoryToXml('3D Shapes', mod.blocks3D, false);
    adv += mod.categoryToXml('2D Shapes', mod.blocks2D, false);
    adv += mod.categoryToXml('Transformations', mod.blocksTransform, false);
    adv += mod.categoryToXml('Set Operations', mod.blocksSetOps, false);
    adv += mod.categoryToXml('Math', mod.blocksMath, false);
    adv += mod.categoryToXml('Logic', mod.blocksLogic, false);
    adv += mod.categoryToXml('Loops', mod.blocksLoops, false);
    adv += mod.categoryToXml('Text', mod.blocksText, false);
    adv += mod.customCategoryToXml('Variables', 'VARIABLE');
    adv += mod.customCategoryToXml('Procedures', 'PROCEDURE');
    adv += '</xml>';

    assert(adv.indexOf('<xml id="toolbox"') === 0, 'advanced toolbox starts with <xml>');
    assert(adv.indexOf('</xml>') === adv.length - '</xml>'.length, 'advanced toolbox ends with </xml>');

    // Count categories — should have 10 (8 block categories + 2 custom)
    var catCount = (adv.match(/<category /g) || []).length;
    assert(catCount === 10, 'advanced toolbox has 10 categories (got ' + catCount + ')');

    // Build simple toolbox
    var sim = '<xml id="toolbox" style="display: none">';
    sim += mod.categoryToXml('3D Shapes', mod.blocks3D, true);
    sim += mod.categoryToXml('Transformations', mod.blocksTransform, true);
    sim += mod.categoryToXml('Set Operations', mod.blocksSetOps, true);
    sim += mod.categoryToXml('Math', mod.blocksMath, true);
    sim += mod.categoryToXml('Text', mod.blocksText, true);
    sim += mod.customCategoryToXml('Variables', 'VARIABLE');
    sim += mod.customCategoryToXml('Procedures', 'PROCEDURE');
    sim += '</xml>';

    var simCatCount = (sim.match(/<category /g) || []).length;
    assert(simCatCount === 7, 'simple toolbox has 7 categories (got ' + simCatCount + ')');

    // Simple toolbox should not contain advancedOnly blocks
    assert(sim.indexOf('torus') < 0, 'simple toolbox excludes torus (advancedOnly)');
    assert(sim.indexOf('fancyrotate') < 0, 'simple toolbox excludes fancyrotate (advancedOnly)');

    // Both toolboxes should contain core blocks
    assert(adv.indexOf('sphere') > 0, 'advanced toolbox contains sphere');
    assert(sim.indexOf('sphere') > 0, 'simple toolbox contains sphere');
    assert(adv.indexOf('cube') > 0, 'advanced toolbox contains cube');
    assert(sim.indexOf('cube') > 0, 'simple toolbox contains cube');
  })();

} finally {
  // Clean up temp files
  try { fs.unlinkSync(testEntry); } catch (e) {}
  try { fs.unlinkSync(testBundle); } catch (e) {}
}

// ============================================================
// SUMMARY
// ============================================================

console.log('\n========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) { console.log('  - ' + e); });
  process.exit(1);
} else {
  console.log('All tests passed.');
  process.exit(0);
}
