export const SPACE = { RGB: 'RGB', lRGB: 'lRGB', CIELAB: 'CIELAB', OKLAB: 'OKLAB' };

export function hex2rgb(hex) {
  hex = hex.replace('#','');
  return [
    parseInt(hex.slice(0,2),16),
    parseInt(hex.slice(2,4),16),
    parseInt(hex.slice(4,6),16)
  ];
}



// Precompute LUT for RGB to lRGB
// https://en.wikipedia.org/wiki/SRGB#Transfer%

const RGB_TO_LRGB = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    RGB_TO_LRGB[i] = v2lrgb(i);
}

export function v2lrgb(value) {
    value /= 255;
    return value > 0.04045
        ? Math.pow((value + 0.055) / 1.055, 2.4)
        : value / 12.92;
}

export function rgb2lrgb(r, g, b, out) {
    // LUT is faster, but only works if r,g,b are integers (don't have dithering error added yet)
    if (
        r >= 0 && r <= 255 && Number.isInteger(r) &&
        g >= 0 && g <= 255 && Number.isInteger(g) &&
        b >= 0 && b <= 255 && Number.isInteger(b)
    ) {
        out[0] = RGB_TO_LRGB[r];
        out[1] = RGB_TO_LRGB[g];
        out[2] = RGB_TO_LRGB[b];
        return;
    }

    // fallback for error-diffused pixels
    out[0] = v2lrgb(r);
    out[1] = v2lrgb(g);
    out[2] = v2lrgb(b);
}


export function lrgb2v(value) {
    return value <= 0.0031308
        ? Math.round(value * 12.92 * 255)
        : Math.round((1.055 * Math.pow(value, 1/2.4) - 0.055) * 255);
}

export function lrgb2rgb(r, g, b, out) {
    out[0] = lrgb2v(r);
    out[1] = lrgb2v(g);
    out[2] = lrgb2v(b);
}



const xn = 0.95047, yn = 1.0, zn = 1.08883; // D65 white point standard illumination
//const xn = 0.964212, yn = 1.0, zn = 0.825188 // D50 white point printed media
export function lrgb2cielab(r, g, b, out) {
    
    // https://en.wikipedia.org/wiki/SRGB#Primaries
    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375);
    let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041);
    
    // https://kaizoudou.com/from-rgb-to-lab-color-space/
    x /= xn; y /= yn; z /= zn;

    x = (x > 0.008856) ? Math.cbrt(x) : (7.787037 * x) + 4 / 29;
    y = (y > 0.008856) ? Math.cbrt(y) : (7.787037 * y) + 4 / 29;
    z = (z > 0.008856) ? Math.cbrt(z) : (7.787037 * z) + 4 / 29;

    out[0] = (116 * y) - 16;
    out[1] = 500 * (x - y);
    out[2] = 200 * (y - z);
}

export function rgb2cielab(r, g, b, out) {
    rgb2lrgb(r, g, b, out);
    lrgb2cielab(out[0], out[1], out[2], out);
}



export function lrgb2oklab(r, g, b, out) {
    // https://kaizoudou.com/from-rgb-to-lab-color-space/

    let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    l = Math.cbrt(l);
    m = Math.cbrt(m);
    s = Math.cbrt(s);

    out[0] = 0.2104542553*l + 0.7936177850*m - 0.0040720468*s;
    out[1] = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s;
    out[2] = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s;
}

export function rgb2oklab(r, g, b, out) {
    rgb2lrgb(r, g, b, out);
    lrgb2oklab(out[0], out[1], out[2], out);
}
