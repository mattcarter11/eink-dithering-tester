export function closestLabIdx(pixel, palette, useCRA = false) {
    let minDist = Infinity;
    let closestIndex = 0;
    
    const k = 0.35;

    for (let i = 0; i < palette.length; i++) {

        const color = palette[i];

        const dL = color[0] - pixel[0];
        const dA = color[1] - pixel[1];
        const dB = color[2] - pixel[2];

        const chromaAlign = pixel[1]*color[1] + pixel[2]*color[2];

        let dist = 2*dL*dL + dA*dA + dB*dB;
        if (useCRA) dist -= k * chromaAlign;

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