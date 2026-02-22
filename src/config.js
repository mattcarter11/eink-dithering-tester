// --- Display ---

export const DISPLAY_WIDTH  = 480;
export const DISPLAY_HEIGHT = 800;
export const DITHER_FACTOR  = 0.9;

// --- Palettes ---

export const pRGB     = ['#000000', '#ffffff', '#0000ff', '#00ff00', '#ff0000', '#ffff00'];
export const pWenting = ['#2e2c42', '#d3d6cd', '#316ac1', '#5c8a5b', '#b11d19', '#d9c701'];
export const pFull = pWenting.concat(pRGB);

// --- Algorithm options ---

export const ALGORITHM_TYPES = {
    floydRGB: 'floydRGB',
    floydLab: 'floydLab',
    floydLabErrRGB: 'floydLabErrRGB',
};

// --- Active algorithms ---

export const algorithms = [
    { name: "RGB - 🎨 RGB",                 type: 'floydRGB', palette: pRGB},
    // { name: "RGB - 🎨 Wenting",             type: 'floydRGB', palette: pWenting }, // Others better
    { name: "RGB - 🎨 Full",                type: 'floydRGB', palette: pFull },

    { name: "RGB boost - 🎨 RGB",           type: 'floydRGB', palette: pRGB, preboost: true },
    // { name: "RGB boost - 🎨 Wenting",       type: 'floydRGB', palette: pWenting, preboost: true }, // Others better
    { name: "RGB boost - 🎨 Full",          type: 'floydRGB', palette: pFull, preboost: true },

    { name: "Lab - 🎨 RGB",                 type: 'floydLab',       palette: pRGB  },
    { name: "Lab errRGB - 🎨 RGB",          type: 'floydLabErrRGB', palette: pRGB  },

    { name: "Lab - 🎨 Wenting",             type: 'floydLab',       palette: pWenting },
    { name: "Lab errRGB - 🎨 Wenting",      type: 'floydLabErrRGB', palette: pWenting },

    { name: "Lab - 🎨 Full",                type: 'floydLab',       palette: pFull },
    { name: "Lab errRGB - 🎨 Full",         type: 'floydLabErrRGB', palette: pFull },
];
