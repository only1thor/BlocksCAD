// Color scheme data for toolbox categories
// Extracted from toolbox.js lines ~26-48

export const colorSchemes = {
  one: [  // classic
    '#006205',  // 3D
    '#209303',  // 2D
    '#26549E',  // Transform
    '#7450E2',  // Set Ops
    '#0185E1',  // Math
    '#BF6920',  // Logic
    '#612485',  // Loops
    '#727272',  // Text
    '#8C7149',  // Variables
    '#900355',  // Modules
  ],
  two: [  // pale
    '#885ee3',  // 3D
    '#82af5a',  // 2D
    '#23901c',  // Transform
    '#377eb8',  // Set Ops
    '#ba9969',  // Math
    '#afaf13',  // Logic
    '#a66658',  // Loops
    '#d761bf',  // Text
    '#999999',  // Variables
    '#b02375',  // Modules
  ],
};

export const allCatNames = [
  'HEX_3D_PRIMITIVE', 'HEX_2D_PRIMITIVE', 'HEX_TRANSFORM',
  'HEX_SETOP', 'HEX_MATH', 'HEX_LOGIC', 'HEX_LOOP', 'HEX_TEXT',
  'HEX_VARIABLE', 'HEX_PROCEDURE',
];

// Indices into allCatNames for simple toolbox
export const simpleCatIndices = [0, 2, 3, 4, 7, 8, 9];
