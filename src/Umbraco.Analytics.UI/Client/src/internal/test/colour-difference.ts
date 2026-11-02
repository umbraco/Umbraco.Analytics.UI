// Colour difference for palette specs: CIEDE2000 between two computed colours, in normal vision or in a simulated
// colour vision deficiency (Machado, Oliveira & Fernandes 2009, severity 1.0). The same maths the T59 palette search used.

/** Normal vision, or a simulated protan, deutan or tritan deficiency. */
export type UauiTestVision = "normal" | "protan" | "deutan" | "tritan";

const CVD: Record<Exclude<UauiTestVision, "normal">, number[][]> = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toEncoded = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

/** A computed `rgb()` or `color(srgb ...)` colour as sRGB from 0 to 1. */
function srgb(computed: string): number[] {
    const numbers = computed.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
    return computed.startsWith("color(srgb") ? numbers.slice(0, 3) : numbers.slice(0, 3).map((c) => c / 255);
}

/** A computed colour as CIELAB (D65), as seen with `vision`. */
export function labOf(computed: string, vision: UauiTestVision = "normal"): number[] {
    let linear = srgb(computed).map(toLinear);
    if (vision !== "normal") {
        // The simulation works on linear RGB; round-trip through the encoding, as a display would clip it.
        linear = CVD[vision].map((row) => toLinear(toEncoded(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2])));
    }
    const [r, g, b] = linear;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [x, y, z] = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map(f);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const rad = Math.PI / 180;

/** CIEDE2000 between two CIELAB colours (Sharma, Wu & Dalal 2005), kL = kC = kH = 1. */
export function ciede2000([L1, a1, b1]: number[], [L2, a2, b2]: number[]): number {
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const Cb = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);
    const hue = (b: number, a: number) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
    const h1p = hue(b1, a1p);
    const h2p = hue(b2, a2p);
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        dhp = h2p - h1p;
        if (dhp > 180) dhp -= 360;
        else if (dhp < -180) dhp += 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
    const Lbp = (L1 + L2) / 2;
    const Cbp = (C1p + C2p) / 2;
    let hbp = h1p + h2p;
    if (C1p * C2p !== 0) {
        if (Math.abs(h1p - h2p) > 180) hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
        else hbp = (h1p + h2p) / 2;
    }
    const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
    const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
    const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
    const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
    const SC = 1 + 0.045 * Cbp;
    const SH = 1 + 0.015 * Cbp * T;
    const RT = -Math.sin(2 * dTheta * rad) * RC;
    return Math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH));
}

/** CIEDE2000 between two computed colours, as seen with `vision`. */
export const colourDifference = (a: string, b: string, vision: UauiTestVision = "normal"): number => ciede2000(labOf(a, vision), labOf(b, vision));
