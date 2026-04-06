import { SPACE, hex2rgb, rgb2lrgb, rgb2cielab, rgb2oklab, lrgb2cielab, lrgb2oklab, lrgb2rgb } from "../math/space.js";
import { closestRGBIdx, closestCIELABIdx, closestOKLABIdx } from "../math/distance.js";

export const WEIGHTS_FLOYD = [
    { dx:  1, dy: 0, w: 7 / 16 },
    { dx: -1, dy: 1, w: 3 / 16 },
    { dx:  0, dy: 1, w: 5 / 16 },
    { dx:  1, dy: 1, w: 1 / 16 },
];


export function convertPalette(hexPalette, space) {
    switch (space) {
        case SPACE.lRGB:    return hexPalette.map(hex => { const p = hex2rgb(hex); rgb2lrgb(p[0], p[1], p[2], p); return p;});
        case SPACE.CIELAB:  return hexPalette.map(hex => { const p = hex2rgb(hex); rgb2cielab(p[0], p[1], p[2], p); return p;});
        case SPACE.OKLAB:   return hexPalette.map(hex => { const p = hex2rgb(hex); rgb2oklab(p[0], p[1], p[2], p); return p;});
        default:            return hexPalette.map(hex2rgb);
    }
}

export function converPixel(pixel, fromSpace, toSpace) {
    if (fromSpace == toSpace) return;

    switch (fromSpace) {
        case SPACE.RGB:
            switch (toSpace) {
                case SPACE.lRGB: rgb2lrgb(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.CIELAB: rgb2cielab(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.OKLAB: rgb2oklab(pixel[0], pixel[1], pixel[2], pixel); return;
            }
            break;
        case SPACE.lRGB:
            switch (toSpace) {
                case SPACE.RGB: lrgb2rgb(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.CIELAB: lrgb2cielab(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.OKLAB: lrgb2oklab(pixel[0], pixel[1], pixel[2], pixel); return;
            }
            break;
    }

    throw new Error(`Unsupported conversion: ${fromSpace} → ${toSpace}`);
}

export function closestIdx(space, pixel, palette) {
    switch (space) {
        case SPACE.CIELAB: return closestCIELABIdx(pixel, palette)
        case SPACE.OKLAB: return closestOKLABIdx(pixel, palette)
        default: return closestRGBIdx(pixel, palette);
    }
}