/*
    Copyright (C) 2014-2015  H3XL, Inc

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview JavaScript for BlocksCAD.
 * @author  jennie@einsteinsworkshop.com (jayod)
 *
 * NOTE: Most functionality has been extracted into ES modules under blockscad/src/.
 * The app-bundle.js (built via esbuild) overwrites the methods below with module versions.
 * This file retains: namespace setup, global properties, init() orchestrator,
 * and the language-loading document.write calls.
 */
'use strict';

// create Blockscad namespace
var Blockscad = Blockscad || {};
Blockscad.Toolbox = Blockscad.Toolbox || {};
Blockscad.Auth = Blockscad.Auth || {};    // cloud accounts plugin
BlocklyStorage = BlocklyStorage || {};
var Blockly = Blockly || {};
var BSUtils = BSUtils || {};

Blockscad.version = "1.7.3";
Blockscad.releaseDate = "2017/03/28";

Blockscad.offline = true;  // if true, won't attempt to contact the Blockscad cloud backend.

Blockscad.standalone = false; // if true, run code needed for the standalone version
Blockscad.gProcessor = null;      // hold the graphics processor, including the mesh generator and viewer.
var _includePath = './';
Blockscad.drawAxes = 1;       // start with axes drawn

// resolution - this value will control the default returned by $fn in the parser.
Blockscad.resolution = 1;

Blockscad.showMessageModal = false;

// Dark mode state (managed by dark-mode.js module)
Blockscad.isDarkMode = false;


// Initialize Blockscad.  Called on page load.

Blockscad.init = function() {
  var pageData = blockscadpage.start();
  $('body').append(pageData);
  Blockscad.initLanguage();

  // version of input files/projects
  Blockscad.inputVersion = Blockscad.version;

  var rtl = BSUtils.isRtl();
  Blockscad.missingFields = [];  // variable to see if any blocks are missing fields
  Blockscad.csg_commands = {}; // holds any converted stl file contents
  Blockscad.csg_filename = {}; // holds any converted stl file names
  Blockscad.csg_center = [0,0,0];

  Blockscad.renderActions = [];


  var container = document.getElementById('main');
  var onresize = function(e) {
    var bBox = BSUtils.getBBox_(container);
    var el = document.getElementById('blocklyDiv');
    el.style.top = bBox.y + 'px';
    el.style.left = bBox.x + 'px';
    // Height and width need to be set, read back, then set again to
    // compensate for scrollbars.
    el.style.height = bBox.height - 88 + 'px';
    el.style.width = bBox.width + 'px';

    // resize the viewer
    if (Blockscad.gProcessor != null && Blockscad.gProcessor.viewer) {
      var h = Blockscad.gProcessor.viewerdiv.offsetHeight;
      var w = Blockscad.gProcessor.viewerdiv.offsetWidth;
      Blockscad.gProcessor.viewer.rendered_resize(w,h);
    }
    // position the div using left and top (that's all I get!)
    if ($( '#main' ).height() - $( '.resizableDiv' ).height() < 70)
      $( '.resizableDiv' ).height($( '#main' ).height() - 70);
    if ($( '#main' ).width() - $( '.resizableDiv' ).width() < 20)
      $( '.resizableDiv' ).width($( '#main' ).width() - 20);

    // reposition the resizable div.
    $(".resizableDiv").position({
      of: $('#main'),
      my: 'right top',
      at: 'right top',
      offset: '-12 -55'
    });
  };
  window.addEventListener('resize', onresize, false);

  Blockscad.Toolbox.createToolbox();

  Blockscad.workspace = Blockly.inject(document.getElementById('blocklyDiv'),
      {
       media: 'blockly/media/',
       zoom:
         {controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2},
       trashcan: false,
       toolbox: Blockscad.Toolbox.sim});

  // Listen to events on blocksCAD workspace.
  Blockscad.workspace.addChangeListener(Blockscad.handleWorkspaceEvents);

  // set the initial color scheme
  Blockscad.Toolbox.setColorScheme(Blockscad.Toolbox.colorScheme['one']);
  // color the initial toolbox
  Blockscad.Toolbox.setCatColors();
  // activate simple toolbox by default
  $('#simpleToolbox').addClass('hidden');
  $('#advancedToolbox').removeClass('hidden');
  // switch to simple toolbox on startup
  if (Blockscad.workspace) {
    Blockscad.Toolbox.catIDs = [];
    Blockscad.workspace.updateToolbox(Blockscad.Toolbox.sim);
    Blockscad.Toolbox.setCatColors();
  }



  if ('BlocklyStorage' in window) {
    // Hook a save function onto unload.
    BlocklyStorage.backupOnUnload();
  }

  // how about putting in the viewer?

  $(".resizableDiv").resizable({
      handles: "s,w,sw",
      resize: function(event, ui) {
          var h = $( window ).height();
          // resize the viewer
          if (Blockscad.gProcessor != null) {
            h = Blockscad.gProcessor.viewerdiv.offsetHeight;
            var w = Blockscad.gProcessor.viewerdiv.offsetWidth;
            Blockscad.gProcessor.viewer.rendered_resize(w,h);
          }
          // position the div using left and top (that's all I get!)
          if ($( '#main' ).width() - ui.size.width < 20)
            ui.size.width = $( '#main' ).width() - 20;
          if ($( '#main' ).height() - ui.size.height < 70)
            ui.size.height = $( '#main' ).height() - 70;

          ui.position.left = $( window ).width() - (ui.size.width + 12);
          ui.position.top = 55;
      }
  });




  Blockly.svgResize(Blockscad.workspace);
  window.dispatchEvent(new Event('resize'));

  if (!Blockscad.offline) {
    // init the user auth stuff
    Blockscad.Auth.init();
  }

  BSUtils.bindClick('trashButton',
     function() {Blockscad.discard(); });

  // render button should render geometry, draw axes, etc.
  BSUtils.bindClick('renderButton', Blockscad.doRender);



  // undo/redo buttons should undo/redo changes
  BSUtils.bindClick('undoButton',
    function() {
      Blockscad.workspace.undo(false)
    });
  BSUtils.bindClick('redoButton',
    function() {
      Blockscad.workspace.undo(true)
    });

  $( '#axesButton' ).click(function() {
    // toggle whether or not we draw the axes, then redraw
    Blockscad.drawAxes = (Blockscad.drawAxes + 1) % 2;
    $( '#axesButton' ).toggleClass("btn-pushed");
    Blockscad.gProcessor.viewer.onDraw();
  });


  $( '#zInButton' ).click(function() {
    Blockscad.gProcessor.viewer.zoomIn();
  });
  $( '#zOutButton' ).click(function() {
    Blockscad.gProcessor.viewer.zoomOut();
  });
  $( '#zResetButton' ).click(function() {
    Blockscad.gProcessor.viewer.viewReset();
  });


  $( '#cameraButton' ).click(function() {
    Blockscad.cameraPic();
  });


  // Initialize CodeMirror editor if available
  if (typeof BlockscadEditor !== 'undefined' && BlockscadEditor.init) {
    BlockscadEditor.init();
  }

  // code tab - update editor with current block code
  $( '#displayCode' ).click(  function() {
    var code = Blockly.OpenSCAD.workspaceToCode(Blockscad.workspace);
    var codeForOutput = Blockscad.processCodeForOutput(code);

    // Update the CodeMirror editor if available, otherwise use fallback textarea
    if (typeof BlockscadEditor !== 'undefined' && BlockscadEditor.isReady && BlockscadEditor.isReady()) {
      BlockscadEditor.setValue(codeForOutput);
      BlockscadEditor.markClean();
    } else {
      // Use fallback textarea
      var fallback = document.getElementById('codeEditorFallback');
      if (fallback) {
        fallback.style.display = 'block';
        fallback.value = codeForOutput;
        // Hide the empty CM div
        var cmDiv = document.getElementById('codeEditorDiv');
        if (cmDiv) cmDiv.style.display = 'none';
      }
    }
    Blockly.svgResize(Blockscad.workspace);
  });

  // Apply Code to Blocks button - reverse sync from code editor to workspace
  $( '#applyCodeBtn' ).click(function() {
    if (typeof BlockscadOpenscadToBlocks === 'undefined') {
      console.error('OpenSCAD to Blocks converter not loaded');
      return;
    }

    // Get code from CodeMirror or fallback textarea
    var code;
    var statusEl = document.getElementById('codeEditorStatus');
    var hasCM = typeof BlockscadEditor !== 'undefined' && BlockscadEditor.isReady && BlockscadEditor.isReady();
    if (hasCM) {
      code = BlockscadEditor.getValue();
    } else {
      var fallback = document.getElementById('codeEditorFallback');
      code = fallback ? fallback.value : '';
    }

    if (!code || !code.trim()) {
      if (hasCM) BlockscadEditor.showError('No code to apply.');
      else if (statusEl) { statusEl.textContent = 'No code to apply.'; statusEl.className = 'error'; }
      return;
    }

    // Confirm before replacing existing blocks
    var blockCount = Blockscad.workspace.getAllBlocks().length;
    if (blockCount > 0) {
      if (!confirm('This will replace all existing blocks. Continue?')) return;
    }

    var result = BlockscadOpenscadToBlocks.convert(code);

    if (!result.success) {
      var errMsg = 'Parse error';
      if (result.errors && result.errors.length > 0) {
        errMsg = result.errors.map(function(e) {
          return 'Line ' + e.line + ': ' + e.message;
        }).join('; ');
      }
      if (hasCM) BlockscadEditor.showError(errMsg);
      else if (statusEl) { statusEl.textContent = errMsg; statusEl.className = 'error'; }
      return;
    }

    try {
      Blockscad.workspace.clear();
      var xml = Blockly.Xml.textToDom(result.xml);
      Blockly.Xml.domToWorkspace(xml, Blockscad.workspace);
      Blockscad.assignBlockTypes(Blockscad.workspace.getTopBlocks());
      if (hasCM) {
        BlockscadEditor.markClean();
        BlockscadEditor.showSuccess('Blocks updated successfully.');
      } else if (statusEl) {
        statusEl.textContent = 'Blocks updated successfully.';
        statusEl.className = 'success';
      }
    } catch (e) {
      if (hasCM) BlockscadEditor.showError('Failed to load blocks: ' + e.message);
      else if (statusEl) { statusEl.textContent = 'Failed to load blocks: ' + e.message; statusEl.className = 'error'; }
    }
  });

  // handle the project->new menu option
  $('#main').on('click', '.new-project', Blockscad.newProject);

  // handle the project->load (blocks, stl, import blocks)  options
  $('#file-menu').on('change', '#loadLocal', function(e) { Blockscad.loadLocalBlocks(e);});
  $('#file-menu').on('change', '#importLocal', function(e) { readSingleFile(e, false);});
  $('#file-menu').on('change', '#importStl', function(e) { Blockscad.readStlFile(e);});

  // what size should pics be taken at?
  Blockscad.picSize = [450,450];
  Blockscad.rpicSize = [250,250];
  Blockscad.picQuality = 0.85;
  Blockscad.numRotPics = 13;
  // hook up the pic-taking button
  $("#picButton").click(Blockscad.takePic);
  $("#rPicButton").click(Blockscad.takeRPic);

  //Create the openjscad processing object instance
  Blockscad.gProcessor = new Blockscad.Processor(document.getElementById("renderDiv"));

  // do we need to prompt the user to save? to start out, no.
  Blockscad.needToSave = 0;

    // test to see if a user is logged in - use this to populate the login-area.
  if (!Blockscad.offline) {
    Blockscad.Auth.checkForUser();
  }

  // pop up about popup
  $('#help-menu').on('click', '#about', function() {
    $('#about-modal').modal('show');
  });

  // set up handler for saving blocks locally
  $('#file-menu').on('click', '#saveLocal', Blockscad.saveBlocksLocal);

  // set up handler for exporting openscad code locally
  $('#file-menu').on('click', '#saveOpenscad', Blockscad.saveOpenscadLocal);

  // toolbox toggle handlers
  $('#simpleToolbox').on('click', function() {
    $('#simpleToolbox').addClass('hidden');
    $('#advancedToolbox').removeClass('hidden');
    if (Blockscad.workspace) {
      Blockscad.Toolbox.catIDs = [];
      Blockscad.workspace.updateToolbox(Blockscad.Toolbox.sim);
      Blockscad.Toolbox.setCatColors();
    }
  });
  $('#advancedToolbox').on('click', function() {
    $('#advancedToolbox').addClass('hidden');
    $('#simpleToolbox').removeClass('hidden');
    if (Blockscad.workspace) {
      Blockscad.Toolbox.catIDs = [];
      Blockscad.workspace.updateToolbox(Blockscad.Toolbox.adv);
      Blockscad.Toolbox.setCatColors();
    }

  });
  $('#colors_one').on('click', function() {
    if (Blockscad.workspace) {
      Blockscad.Toolbox.setColorScheme(Blockscad.Toolbox.colorScheme['one']);
      Blockscad.Toolbox.setCatColors();

      var current_xml = Blockly.Xml.workspaceToDom(Blockscad.workspace);
      Blockscad.workspace.clear();
      Blockly.Xml.domToWorkspace(current_xml,Blockscad.workspace);
    }

  });
  $('#colors_two').on('click', function() {
    if (Blockscad.workspace) {
      Blockscad.Toolbox.setColorScheme(Blockscad.Toolbox.colorScheme['two']);
      Blockscad.Toolbox.setCatColors();
      var current_xml = Blockly.Xml.workspaceToDom(Blockscad.workspace);
      Blockscad.workspace.clear();
      Blockly.Xml.domToWorkspace(current_xml,Blockscad.workspace);
    }
  });

  // Dark mode toggle handler
  $('#darkModeToggle').on('click', function() {
    Blockscad.toggleDarkMode();
  });

  // add "default color" picker to viewer
  Blockscad.setColor = function(r,g,b) {
    if (Blockscad.gProcessor != null && Blockscad.gProcessor.viewer){
      Blockscad.gProcessor.viewer.defaultColor = [r/255,g/255,b/255,1];
      Blockscad.gProcessor.picviewer.defaultColor = [r/255,g/255,b/255,1];
      Blockscad.gProcessor.rpicviewer.defaultColor = [r/255,g/255,b/255,1];
      if (Blockscad.gProcessor.hasSolid()) {
        Blockscad.gProcessor.viewer.setCsg(Blockscad.gProcessor.currentObject);
        Blockscad.gProcessor.picviewer.setCsg(Blockscad.gProcessor.currentObject);
        Blockscad.gProcessor.rpicviewer.setCsg(Blockscad.gProcessor.currentObject);
        var images = Blockscad.gProcessor.picviewer.takePic(Blockscad.picQuality,0);
        Blockscad.gProcessor.img = images[0];
        Blockscad.gProcessor.imgStrip = Blockscad.gProcessor.takeRotatingPic(0.9,Blockscad.numRotPics);
        Blockscad.gProcessor.thumbnail = images[1];
      }
      Blockscad.defaultColor = Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b);
      $("#defColor").spectrum("set", 'rgb(' + Blockscad.defaultColor + ')');
    }
  }

  $("#defColor").spectrum({
    color: 'rgb(255,128,255)',
    showPalette: true,
    className: "defaultColor btn btn-default",
    appendTo: "#viewerButtons",
    hideAfterPaletteSelect:true,
    showPaletteOnly: true,
    change: function(color) {
      Blockscad.setColor(color._r,color._g,color._b);

    },
      palette: [
          ['rgb(255,128,255);', 'rgb(153,153,153);','rgb(238,60,60);', 'rgb(250,150,0);'],
          ['rgb(250,214,0);'  , 'rgb(50,220,50);'    ,'rgb(20,150,255);' , 'rgb(180,85,254);']
      ]
  });

  // the color picker has a downward triangle that I don't like.  Remove it.
  $('.sp-dd').remove();

  // example handlers
  $("#examples_torus").click({msg: "torus.xml"}, Blockscad.showExample);
  $("#examples_box").click({msg: "box.xml"}, Blockscad.showExample);
  $("#examples_linear_extrude").click({msg: "linear_extrude.xml"}, Blockscad.showExample);
  $("#examples_rotate_extrude").click({msg: "rotate_extrude.xml"}, Blockscad.showExample);
  $("#examples_cube_with_cutouts").click({msg: "cube_with_cutouts.xml"}, Blockscad.showExample);
  $("#examples_anthias_fish").click({msg: "anthias_fish.xml"}, Blockscad.showExample);
  $("#examples_hulled_loop_sun").click({msg: "hulled_loop_sun.xml"}, Blockscad.showExample);
  $("#examples_sine_function_with_loop").click({msg: "sine_function_with_loop.xml"}, Blockscad.showExample);
  $("#examples_trefoil_knot_param_eq").click({msg: "trefoil_knot_param_eq.xml"}, Blockscad.showExample);

  // to get sub-menus to work with bootstrap 3 navbar
  $(function(){
    $(".dropdown-menu > li > a.trigger").on("click",function(e){
      var current=$(this).next();
      var grandparent=$(this).parent().parent();
      if($(this).hasClass('left-caret')||$(this).hasClass('right-caret'))
        $(this).toggleClass('right-caret left-caret');
      grandparent.find('.left-caret').not(this).toggleClass('right-caret left-caret');
      grandparent.find(".sub-menu:visible").not(current).hide();
      current.toggle();
      e.stopPropagation();
    });
    $(".dropdown-menu > li > a:not(.trigger)").on("click",function(){
      var root=$(this).closest('.dropdown');
      root.find('.left-caret').toggleClass('right-caret left-caret');
      root.find('.sub-menu:visible').hide();
    });
  });
  $('#stl_buttons').addClass('hidden');

  if (!Blockscad.standalone) {
    BSUtils.loadBlocks('');
  }
  else {
    // for standalone, just call restoreBlocks directly
    BlocklyStorage.standaloneRestoreBlocks();
  }

  // are there any messages to show?
  if (Blockscad.showMessageModal)
    $('#outage-modal').modal('show');

  // Initialize dark mode from saved preference
  Blockscad.initDarkMode();

  setTimeout(Blockscad.typeWorkspace, 10);


}; // end Blockscad.init()

/**
 * Initialize the page language.
 */
Blockscad.initLanguage = function() {
  // Set the HTML's language and direction.
  var rtl = BSUtils.isRtl();
  document.head.parentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  document.head.parentElement.setAttribute('lang', BSUtils.LANG);

  // Sort languages alphabetically.
  var languages = [];
  var lang;
  for (lang in BSUtils.LANGUAGE_NAME) {
    languages.push([BSUtils.LANGUAGE_NAME[lang], lang]);
  }
  var comp = function(a, b) {
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    return 0;
  };
  languages.sort(comp);
  var items = [];

  for (var i = 0; i < languages.length; i++) {
    items.push('<li><a href="#" class="lang-option" data-lang="' + languages[i][1] + '"</a>' + languages[i][0] + '</li>');
  }

  $('#languageMenu').append( items.join('') );

  $('.lang-option').on("click", BSUtils.changeLanguage);
};

// Load Blockly's (and Blockscad's) language strings.
document.write('<script src="blockly/msg/js/' + BSUtils.LANG + '.js"></script>\n');
document.write('<script src="blockscad/msg/js/' + BSUtils.LANG + '.js"></script>\n');

// on page load, call blockscad init function.
window.addEventListener('load', Blockscad.init);
