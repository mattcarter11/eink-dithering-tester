export function closestCIELABIdx(pixel, palette) {
    let minDist = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < palette.length; i++) {

        const color = palette[i];

        const dL = color[0] - pixel[0];
        const dA = color[1] - pixel[1];
        const dB = color[2] - pixel[2];

        // CIELAB is not really linear, we try correting that (https://en.wikipedia.org/wiki/Color_difference)
        //let dist = dL*dL + dA*dA + dB*dB;
        let dist = 2 * dL*dL + dA*dA + dB*dB;
        // let dist = Math.abs(dL) + Math.sqrt(dA*dA + dB*dB);

        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    return closestIndex;
}

export function closestOKLABIdx(pixel, palette) {
    let minDist = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < palette.length; i++) {

        const color = palette[i];

        const dL = color[0] - pixel[0];
        const dA = color[1] - pixel[1];
        const dB = color[2] - pixel[2];

        let dist = dL*dL + dA*dA + dB*dB;

        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    return closestIndex;
}

export function closestRGBIdx(pixel, palette) {
    let minDist = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        
        const dR = color[0] - pixel[0];
        const dG = color[1] - pixel[1];
        const dB = color[2] - pixel[2];
        
        const dist = dR*dR + dG*dG + dB*dB;

        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    return closestIndex;
}