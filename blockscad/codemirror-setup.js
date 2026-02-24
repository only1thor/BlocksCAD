/**
 * CodeMirror 6 setup for BlocksCAD Code Editor
 *
 * Initializes a CodeMirror 6 editor instance with OpenSCAD syntax highlighting
 * in the #codeEditorDiv element. Exposes a global BlockscadEditor object.
 *
 * Dependencies: CodeMirror 6 ESM modules loaded via importmap in index.html
 */

(function() {
  'use strict';

  // We'll initialize once the DOM element exists and CM modules are loaded
  var editorView = null;
  var changeCallbacks = [];
  var isDirty = false;
  var lastSyncedCode = '';

  // OpenSCAD keywords for syntax highlighting
  var openscadKeywords = [
    'module', 'function', 'if', 'else', 'for', 'let', 'each',
    'true', 'false', 'undef'
  ];

  var openscadBuiltins = [
    'union', 'difference', 'intersection', 'hull', 'minkowski',
    'translate', 'rotate', 'scale', 'mirror', 'multmatrix', 'color',
    'linear_extrude', 'rotate_extrude',
    'cube', 'sphere', 'cylinder', 'polyhedron',
    'circle', 'square', 'polygon', 'text',
    'import', 'surface', 'projection',
    'render', 'children', 'echo', 'assert',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'abs', 'ceil', 'floor', 'round', 'sign',
    'sqrt', 'pow', 'exp', 'ln', 'log', 'len',
    'min', 'max', 'norm', 'cross',
    'concat', 'lookup', 'str', 'chr', 'ord',
    'search', 'version', 'parent_module'
  ];

  /**
   * Simple OpenSCAD language support using StreamLanguage
   */
  function openscadStreamParser() {
    return {
      startState: function() {
        return { inBlockComment: false };
      },
      token: function(stream, state) {
        // Block comment
        if (state.inBlockComment) {
          if (stream.match(/.*?\*\//)) {
            state.inBlockComment = false;
          } else {
            stream.skipToEnd();
          }
          return 'comment';
        }

        // Start of block comment
        if (stream.match('/*')) {
          state.inBlockComment = true;
          if (stream.match(/.*?\*\//)) {
            state.inBlockComment = false;
          } else {
            stream.skipToEnd();
          }
          return 'comment';
        }

        // Line comment
        if (stream.match('//')) {
          stream.skipToEnd();
          return 'comment';
        }

        // Strings
        if (stream.match('"')) {
          while (!stream.eol()) {
            var ch = stream.next();
            if (ch === '"') break;
            if (ch === '\\') stream.next();
          }
          return 'string';
        }

        // Numbers
        if (stream.match(/^-?(?:0x[\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)/)) {
          return 'number';
        }

        // Special variables ($fn, $fa, $fs, $t, etc.)
        if (stream.match(/^\$\w+/)) {
          return 'variableName.special';
        }

        // Identifiers and keywords
        if (stream.match(/^[a-zA-Z_]\w*/)) {
          var word = stream.current();
          if (openscadKeywords.indexOf(word) !== -1) return 'keyword';
          if (openscadBuiltins.indexOf(word) !== -1) return 'typeName';
          return 'variableName';
        }

        // Operators
        if (stream.match(/^[+\-*\/%<>=!&|?:]+/)) {
          return 'operator';
        }

        // Brackets
        if (stream.match(/^[{}\[\]()]/)) {
          return 'bracket';
        }

        // Semicolons, commas
        if (stream.match(/^[;,]/)) {
          return 'punctuation';
        }

        // Skip whitespace
        if (stream.eatSpace()) return null;

        // Skip unknown characters
        stream.next();
        return null;
      }
    };
  }

  /**
   * Initialize the CodeMirror editor.
   * Called after CM modules are available and the DOM is ready.
   */
  function initEditor() {
    var container = document.getElementById('codeEditorDiv');
    if (!container) {
      console.error('BlockscadEditor: #codeEditorDiv not found');
      return;
    }

    // Access CodeMirror modules from the global namespace (loaded via IIFE bundle)
    var cmView = window.CM['@codemirror/view'];
    var cmState = window.CM['@codemirror/state'];
    var cmLanguage = window.CM['@codemirror/language'];
    var cmCommands = window.CM['@codemirror/commands'];
    var cmSearch = window.CM['@codemirror/search'];
    var cmAutocomplete = window.CM['@codemirror/autocomplete'];
    var cmLint = window.CM['@codemirror/lint'];
    var lezerHighlight = window.CM['@lezer/highlight'];

    if (!cmView || !cmState) {
      console.error('BlockscadEditor: CodeMirror modules not loaded');
      return;
    }

    // Create the OpenSCAD language using StreamLanguage
    var openscadLang = cmLanguage.StreamLanguage.define(openscadStreamParser());

    // Define a simple highlight style
    var highlightStyle = cmLanguage.HighlightStyle.define([
      { tag: lezerHighlight.tags.keyword, color: '#7928a1' },
      { tag: lezerHighlight.tags.typeName, color: '#0550ae' },
      { tag: lezerHighlight.tags.variableName, color: '#24292f' },
      { tag: [lezerHighlight.tags.special(lezerHighlight.tags.variableName)], color: '#953800' },
      { tag: lezerHighlight.tags.number, color: '#0550ae' },
      { tag: lezerHighlight.tags.string, color: '#0a3069' },
      { tag: lezerHighlight.tags.comment, color: '#6e7781', fontStyle: 'italic' },
      { tag: lezerHighlight.tags.operator, color: '#cf222e' },
      { tag: lezerHighlight.tags.bracket, color: '#24292f' },
      { tag: lezerHighlight.tags.punctuation, color: '#24292f' }
    ]);

    // Dark mode highlight style
    var darkHighlightStyle = cmLanguage.HighlightStyle.define([
      { tag: lezerHighlight.tags.keyword, color: '#c678dd' },
      { tag: lezerHighlight.tags.typeName, color: '#61aeee' },
      { tag: lezerHighlight.tags.variableName, color: '#abb2bf' },
      { tag: [lezerHighlight.tags.special(lezerHighlight.tags.variableName)], color: '#d19a66' },
      { tag: lezerHighlight.tags.number, color: '#d19a66' },
      { tag: lezerHighlight.tags.string, color: '#98c379' },
      { tag: lezerHighlight.tags.comment, color: '#5c6370', fontStyle: 'italic' },
      { tag: lezerHighlight.tags.operator, color: '#56b6c2' },
      { tag: lezerHighlight.tags.bracket, color: '#abb2bf' },
      { tag: lezerHighlight.tags.punctuation, color: '#abb2bf' }
    ]);

    // Determine if dark mode is active
    var isDarkMode = document.body.classList.contains('dark-mode');

    // Base theme for editor appearance
    var editorTheme = cmView.EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px'
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: '"Source Code Pro", "Consolas", "Monaco", monospace'
      },
      '.cm-gutters': {
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #ddd'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#e8e8e8'
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: '#333'
      }
    });

    var darkEditorTheme = cmView.EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px',
        backgroundColor: '#282c34'
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: '"Source Code Pro", "Consolas", "Monaco", monospace'
      },
      '.cm-content': {
        caretColor: '#528bff'
      },
      '.cm-gutters': {
        backgroundColor: '#21252b',
        color: '#636d83',
        borderRight: '1px solid #3e4452'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#2c313a'
      },
      '.cm-activeLine': {
        backgroundColor: '#2c313a44'
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: '#528bff'
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: '#3e4451'
      }
    });

    // Build extensions list
    var extensions = [
      cmView.lineNumbers(),
      cmView.highlightActiveLine(),
      cmView.highlightSpecialChars(),
      cmView.drawSelection(),
      cmView.dropCursor(),
      cmView.rectangularSelection(),
      cmView.crosshairCursor(),
      cmState.EditorState.allowMultipleSelections.of(true),
      cmLanguage.indentOnInput(),
      cmLanguage.bracketMatching(),
      cmAutocomplete.closeBrackets(),
      cmLanguage.foldGutter(),
      cmCommands.history(),
      cmSearch.highlightSelectionMatches(),
      cmView.keymap.of([
        ...cmAutocomplete.closeBracketsKeymap,
        ...cmCommands.defaultKeymap,
        ...cmSearch.searchKeymap,
        ...cmCommands.historyKeymap,
        cmCommands.indentWithTab
      ]),
      openscadLang,
      isDarkMode ? darkEditorTheme : editorTheme,
      isDarkMode
        ? cmLanguage.syntaxHighlighting(darkHighlightStyle)
        : cmLanguage.syntaxHighlighting(highlightStyle),
      cmView.EditorView.updateListener.of(function(update) {
        if (update.docChanged) {
          isDirty = true;
          updateDirtyIndicator();
          for (var i = 0; i < changeCallbacks.length; i++) {
            changeCallbacks[i](BlockscadEditor.getValue());
          }
        }
      })
    ];

    var startState = cmState.EditorState.create({
      doc: '// Switch to Blocks tab and back to generate code\n',
      extensions: extensions
    });

    editorView = new cmView.EditorView({
      state: startState,
      parent: container
    });

    // Store references for theme switching
    BlockscadEditor._lightTheme = editorTheme;
    BlockscadEditor._darkTheme = darkEditorTheme;
    BlockscadEditor._lightHighlight = highlightStyle;
    BlockscadEditor._darkHighlight = darkHighlightStyle;
    BlockscadEditor._cmView = cmView;
    BlockscadEditor._cmState = cmState;
    BlockscadEditor._cmLanguage = cmLanguage;
    BlockscadEditor._cmCommands = cmCommands;
    BlockscadEditor._cmSearch = cmSearch;
    BlockscadEditor._cmAutocomplete = cmAutocomplete;
    BlockscadEditor._openscadLang = openscadLang;

    console.log('BlockscadEditor: initialized');
  }

  function updateDirtyIndicator() {
    var statusEl = document.getElementById('codeEditorStatus');
    if (statusEl && isDirty) {
      if (!statusEl.textContent || statusEl.textContent.indexOf('Modified') === -1) {
        // Don't overwrite error messages
        if (!statusEl.classList.contains('error')) {
          statusEl.textContent = 'Modified - click "Apply to Blocks" to sync';
          statusEl.className = 'modified';
        }
      }
    }
  }

  // Global BlockscadEditor object
  window.BlockscadEditor = {
    /**
     * Initialize the editor. Call after DOM is ready and CM modules are loaded.
     */
    init: function() {
      initEditor();
    },

    /**
     * Check if the editor was successfully initialized.
     */
    isReady: function() {
      return !!editorView;
    },

    /**
     * Get the current editor content.
     */
    getValue: function() {
      if (!editorView) return '';
      return editorView.state.doc.toString();
    },

    /**
     * Set the editor content (used for forward sync from blocks).
     */
    setValue: function(code) {
      if (!editorView) return;
      var cmState = window.CM['@codemirror/state'];
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: code
        }
      });
      lastSyncedCode = code;
      isDirty = false;
      var statusEl = document.getElementById('codeEditorStatus');
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = '';
      }
    },

    /**
     * Register a change callback.
     */
    onchange: function(callback) {
      changeCallbacks.push(callback);
    },

    /**
     * Check if editor has unsaved changes.
     */
    isDirty: function() {
      return isDirty;
    },

    /**
     * Mark as clean (after successful apply).
     */
    markClean: function() {
      isDirty = false;
      lastSyncedCode = BlockscadEditor.getValue();
      var statusEl = document.getElementById('codeEditorStatus');
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = '';
      }
    },

    /**
     * Update theme when dark mode is toggled.
     */
    updateTheme: function(dark) {
      if (!editorView) return;
      // Recreate the editor with new theme
      var code = BlockscadEditor.getValue();
      var container = document.getElementById('codeEditorDiv');
      editorView.destroy();
      editorView = null;

      var cmView = window.CM['@codemirror/view'];
      var cmState = window.CM['@codemirror/state'];
      var cmLanguage = window.CM['@codemirror/language'];
      var cmCommands = window.CM['@codemirror/commands'];
      var cmSearch = window.CM['@codemirror/search'];
      var cmAutocomplete = window.CM['@codemirror/autocomplete'];
      var lezerHighlight = window.CM['@lezer/highlight'];

      var extensions = [
        cmView.lineNumbers(),
        cmView.highlightActiveLine(),
        cmView.highlightSpecialChars(),
        cmView.drawSelection(),
        cmView.dropCursor(),
        cmView.rectangularSelection(),
        cmView.crosshairCursor(),
        cmState.EditorState.allowMultipleSelections.of(true),
        cmLanguage.indentOnInput(),
        cmLanguage.bracketMatching(),
        cmAutocomplete.closeBrackets(),
        cmLanguage.foldGutter(),
        cmCommands.history(),
        cmSearch.highlightSelectionMatches(),
        cmView.keymap.of([
          ...cmAutocomplete.closeBracketsKeymap,
          ...cmCommands.defaultKeymap,
          ...cmSearch.searchKeymap,
          ...cmCommands.historyKeymap,
          cmCommands.indentWithTab
        ]),
        BlockscadEditor._openscadLang,
        dark ? BlockscadEditor._darkTheme : BlockscadEditor._lightTheme,
        dark
          ? cmLanguage.syntaxHighlighting(BlockscadEditor._darkHighlight)
          : cmLanguage.syntaxHighlighting(BlockscadEditor._lightHighlight),
        cmView.EditorView.updateListener.of(function(update) {
          if (update.docChanged) {
            isDirty = true;
            updateDirtyIndicator();
            for (var i = 0; i < changeCallbacks.length; i++) {
              changeCallbacks[i](BlockscadEditor.getValue());
            }
          }
        })
      ];

      var state = cmState.EditorState.create({
        doc: code,
        extensions: extensions
      });

      editorView = new cmView.EditorView({
        state: state,
        parent: container
      });
    },

    /**
     * Show an error status message.
     */
    showError: function(message) {
      var statusEl = document.getElementById('codeEditorStatus');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'error';
      }
    },

    /**
     * Show a success status message.
     */
    showSuccess: function(message) {
      var statusEl = document.getElementById('codeEditorStatus');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'success';
      }
    }
  };

})();
