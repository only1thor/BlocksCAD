// Block definitions as data objects for toolbox generation
// Each block has: type, values (shadow inputs), and optional advancedOnly flag

export const blocks3D = [
  { type: 'sphere', values: { RAD: { shadow: 'math_number', default: '10' } } },
  { type: 'cube', values: {
    XVAL: { shadow: 'math_number', default: '10' },
    YVAL: { shadow: 'math_number', default: '10' },
    ZVAL: { shadow: 'math_number', default: '10' },
  }},
  { type: 'cylinder', values: {
    RAD1: { shadow: 'math_number', default: '10' },
    RAD2: { shadow: 'math_number', default: '10' },
    HEIGHT: { shadow: 'math_number', default: '10' },
  }},
  { type: 'torus', advancedOnly: true, values: {
    RAD1: { shadow: 'math_number', default: '4' },
    RAD2: { shadow: 'math_number', default: '1' },
    SIDES: { shadow: 'math_number', default: '8' },
    FACES: { shadow: 'math_number', default: '16' },
  }},
];

export const blocks2D = [
  { type: 'circle', values: { RAD: { shadow: 'math_number', default: '10' } } },
  { type: 'square', values: {
    XVAL: { shadow: 'math_number', default: '10' },
    YVAL: { shadow: 'math_number', default: '10' },
  }},
];

export const blocksTransform = [
  { type: 'translate', values: {
    XVAL: { shadow: 'math_number', default: '0' },
    YVAL: { shadow: 'math_number', default: '0' },
    ZVAL: { shadow: 'math_number', default: '0' },
  }},
  { type: 'simplerotate', values: {
    XVAL: { shadow: 'math_angle', default: '0' },
    YVAL: { shadow: 'math_angle', default: '0' },
    ZVAL: { shadow: 'math_angle', default: '0' },
  }},
  { type: 'simplemirror_new', advancedOnly: true },
  { type: 'scale', values: {
    XVAL: { shadow: 'math_number', default: '1' },
    YVAL: { shadow: 'math_number', default: '1' },
    ZVAL: { shadow: 'math_number', default: '1' },
  }},
  { type: 'color', values: {
    COLOR: { shadow: 'colour_picker', field: 'COLOUR', default: '#ffcc00' },
  }},
  { type: 'color_rgb', advancedOnly: true, values: {
    RED: { shadow: 'math_number', default: '100' },
    GREEN: { shadow: 'math_number', default: '100' },
    BLUE: { shadow: 'math_number', default: '100' },
  }},
  { type: '$fn', values: {
    SIDES: { shadow: 'math_number', default: '8' },
  }},
  { type: 'taper', advancedOnly: true, values: {
    FACTOR: { shadow: 'math_number', default: '1' },
  }},
  { type: 'linearextrude', advancedOnly: true, values: {
    HEIGHT: { shadow: 'math_number', default: '10' },
    TWIST: { shadow: 'math_angle', default: '0' },
    XSCALE: { shadow: 'math_number', default: '1' },
    YSCALE: { shadow: 'math_number', default: '1' },
  }},
  { type: 'rotateextrude', advancedOnly: true, values: {
    FACES: { shadow: 'math_number', default: '5' },
  }},
  { type: 'fancyrotate', advancedOnly: true, values: {
    AVAL: { shadow: 'math_angle', default: '0' },
    XVAL: { shadow: 'math_number', default: '0' },
    YVAL: { shadow: 'math_number', default: '0' },
    ZVAL: { shadow: 'math_number', default: '0' },
  }},
  { type: 'fancymirror', advancedOnly: true, values: {
    XVAL: { shadow: 'math_number', default: '1' },
    YVAL: { shadow: 'math_number', default: '1' },
    ZVAL: { shadow: 'math_number', default: '1' },
  }},
];

export const blocksSetOps = [
  { type: 'union' },
  { type: 'difference' },
  { type: 'intersection' },
  { type: 'hull', advancedOnly: true },
];

export const blocksMath = [
  { type: 'math_number' },
  { type: 'math_angle', advancedOnly: true },
  { type: 'math_arithmetic', values: {
    A: { shadow: 'math_number', default: '1' },
    B: { shadow: 'math_number', default: '1' },
  }},
  { type: 'math_single', values: {
    NUM: { shadow: 'math_number', default: '9' },
  }, advancedOnly: true },
  { type: 'math_trig', advancedOnly: true, values: {
    NUM: { shadow: 'math_number', default: '45' },
  }},
  { type: 'math_constant_bs', advancedOnly: true },
  { type: 'math_number_property', advancedOnly: true, values: {
    NUMBER_TO_CHECK: { shadow: 'math_number', default: '0' },
  }},
  { type: 'math_round', advancedOnly: true, values: {
    NUM: { shadow: 'math_number', default: '3.1' },
  }},
  { type: 'math_modulo', advancedOnly: true, values: {
    DIVIDEND: { shadow: 'math_number', default: '64' },
    DIVISOR: { shadow: 'math_number', default: '10' },
  }},
  { type: 'math_constrain', advancedOnly: true, values: {
    VALUE: { shadow: 'math_number', default: '50' },
    LOW: { shadow: 'math_number', default: '1' },
    HIGH: { shadow: 'math_number', default: '100' },
  }},
  { type: 'math_random_int', values: {
    FROM: { shadow: 'math_number', default: '1' },
    TO: { shadow: 'math_number', default: '100' },
  }},
  { type: 'math_random_float', advancedOnly: true },
];

export const blocksLogic = [
  { type: 'controls_if', advancedOnly: true },
  { type: 'logic_compare', advancedOnly: true },
  { type: 'logic_operation', advancedOnly: true },
  { type: 'logic_negate', advancedOnly: true },
  { type: 'logic_boolean', advancedOnly: true },
  { type: 'logic_ternary', advancedOnly: true },
];

export const blocksLoops = [
  { type: 'controls_for', advancedOnly: true, values: {
    FROM: { shadow: 'math_number', default: '1' },
    TO: { shadow: 'math_number', default: '10' },
    BY: { shadow: 'math_number', default: '1' },
  }},
];

export const blocksText = [
  { type: 'bs_text', advancedOnly: true, values: {
    TEXT: { shadow: 'text', default: '' },
    SIZE: { shadow: 'math_number', default: '10' },
  }},
  { type: 'bs_3dtext', values: {
    TEXT: { shadow: 'text', default: '' },
    SIZE: { shadow: 'math_number', default: '10' },
    THICKNESS: { shadow: 'math_number', default: '2' },
  }},
  { type: 'text', advancedOnly: true },
  { type: 'bs_text_length', advancedOnly: true, values: {
    VALUE: { shadow: 'text', field: 'TEXT', default: 'abc' },
  }},
];
