/**
 * CodeMirror 6 bundle entry point.
 * Bundles all CM6 modules and exposes them on window.CM namespace.
 */
import * as view from '@codemirror/view';
import * as state from '@codemirror/state';
import * as language from '@codemirror/language';
import * as commands from '@codemirror/commands';
import * as search from '@codemirror/search';
import * as autocomplete from '@codemirror/autocomplete';
import * as lint from '@codemirror/lint';
import * as highlight from '@lezer/highlight';

window.CM = {
  '@codemirror/view': view,
  '@codemirror/state': state,
  '@codemirror/language': language,
  '@codemirror/commands': commands,
  '@codemirror/search': search,
  '@codemirror/autocomplete': autocomplete,
  '@codemirror/lint': lint,
  '@lezer/highlight': highlight,
};
