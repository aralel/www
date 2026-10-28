// Minimal QR code encoder: byte mode, error correction level M, versions 1-10 (up to 213 bytes).
// Enough for page URLs and it keeps the repo free of dependencies. Returns the module matrix.
//
//   const modules = encodeQr("https://www.aralel.com/");   // array of rows, true = dark module
//   const svg = qrToSvg(modules);

// Level M, per version: [error correction codewords per block, [[block count, data codewords per block], ...]]
const BLOCK_LAYOUT = [
    null,
    [10, [[1, 16]]],
    [16, [[1, 28]]],
    [26, [[1, 44]]],
    [18, [[2, 32]]],
    [24, [[2, 43]]],
    [16, [[4, 27]]],
    [18, [[4, 31]]],
    [22, [[2, 38], [2, 39]]],
    [22, [[3, 36], [2, 37]]],
    [26, [[4, 43], [1, 44]]],
];
const ALIGNMENT_POSITIONS = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const MAX_VERSION = 10;

// ── Reed-Solomon over GF(256), polynomial 0x11d ──
const EXP_TABLE = new Array(512);
const LOG_TABLE = new Array(256);
{
    let value = 1;
    for (let power = 0; power < 255; power++) {
        EXP_TABLE[power] = value;
        LOG_TABLE[value] = power;
        value <<= 1;
        if (value & 0x100) value ^= 0x11d;
    }
    for (let power = 255; power < 512; power++) EXP_TABLE[power] = EXP_TABLE[power - 255];
}
const gfMultiply = (a, b) => (a === 0 || b === 0 ? 0 : EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]]);

function reedSolomonRemainder(dataBytes, ecCount) {
    let generator = [1];
    for (let power = 0; power < ecCount; power++) {
        const next = new Array(generator.length + 1).fill(0);
        generator.forEach((coefficient, index) => {
            next[index] ^= coefficient;
            next[index + 1] ^= gfMultiply(coefficient, EXP_TABLE[power]);
        });
        generator = next;
    }
    const remainder = new Array(ecCount).fill(0);
    for (const dataByte of dataBytes) {
        const factor = dataByte ^ remainder.shift();
        remainder.push(0);
        generator.slice(1).forEach((coefficient, index) => { remainder[index] ^= gfMultiply(coefficient, factor); });
    }
    return remainder;
}

// ── Bit helpers ──
function bchRemainder(value, polynomial, polynomialBits) {
    let remainder = value << (polynomialBits - 1);
    for (let bit = 31; bit >= polynomialBits - 1; bit--) {
        if (remainder & (1 << bit)) remainder ^= polynomial << (bit - (polynomialBits - 1));
    }
    return remainder;
}

function formatBits(maskIndex) {
    const data = (0b00 << 3) | maskIndex; // level M = 00
    return ((data << 10) | bchRemainder(data, 0x537, 11)) ^ 0x5412;
}

function versionBits(version) {
    return (version << 12) | bchRemainder(version, 0x1f25, 13);
}

function buildCodewords(textBytes, version) {
    const [ecPerBlock, groups] = BLOCK_LAYOUT[version];
    const dataCapacity = groups.reduce((sum, [count, size]) => sum + count * size, 0);
    const bits = [];
    const pushBits = (value, length) => { for (let bit = length - 1; bit >= 0; bit--) bits.push((value >> bit) & 1); };
    pushBits(0b0100, 4);
    pushBits(textBytes.length, version < 10 ? 8 : 16);
    textBytes.forEach((byte) => pushBits(byte, 8));
    pushBits(0, Math.min(4, dataCapacity * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const dataBytes = [];
    for (let index = 0; index < bits.length; index += 8) dataBytes.push(parseInt(bits.slice(index, index + 8).join(""), 2));
    for (let pad = 0; dataBytes.length < dataCapacity; pad++) dataBytes.push(pad % 2 === 0 ? 0xec : 0x11);

    const blocks = [];
    let offset = 0;
    for (const [count, size] of groups) {
        for (let blockIndex = 0; blockIndex < count; blockIndex++) {
            const blockData = dataBytes.slice(offset, offset + size);
            offset += size;
            blocks.push({ data: blockData, ec: reedSolomonRemainder(blockData, ecPerBlock) });
        }
    }
    const interleaved = [];
    const longestBlock = Math.max(...blocks.map((block) => block.data.length));
    for (let index = 0; index < longestBlock; index++) blocks.forEach((block) => { if (index < block.data.length) interleaved.push(block.data[index]); });
    for (let index = 0; index < ecPerBlock; index++) blocks.forEach((block) => interleaved.push(block.ec[index]));
    return interleaved;
}

// ── Matrix ──
const MASKS = [
    (row, column) => (row + column) % 2 === 0,
    (row) => row % 2 === 0,
    (row, column) => column % 3 === 0,
    (row, column) => (row + column) % 3 === 0,
    (row, column) => (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0,
    (row, column) => ((row * column) % 2) + ((row * column) % 3) === 0,
    (row, column) => (((row * column) % 2) + ((row * column) % 3)) % 2 === 0,
    (row, column) => (((row + column) % 2) + ((row * column) % 3)) % 2 === 0,
];

function buildBaseMatrix(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Array(size).fill(false));
    const reserved = Array.from({ length: size }, () => new Array(size).fill(false));
    const setFunctionModule = (row, column, dark) => {
        if (row < 0 || column < 0 || row >= size || column >= size) return;
        modules[row][column] = dark;
        reserved[row][column] = true;
    };

    const placeFinder = (top, left) => {
        for (let rowOffset = -1; rowOffset <= 7; rowOffset++) {
            for (let columnOffset = -1; columnOffset <= 7; columnOffset++) {
                const inRing = rowOffset >= 0 && rowOffset <= 6 && columnOffset >= 0 && columnOffset <= 6
                    && (rowOffset === 0 || rowOffset === 6 || columnOffset === 0 || columnOffset === 6
                        || (rowOffset >= 2 && rowOffset <= 4 && columnOffset >= 2 && columnOffset <= 4));
                setFunctionModule(top + rowOffset, left + columnOffset, inRing);
            }
        }
    };
    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    for (let index = 8; index < size - 8; index++) {
        setFunctionModule(6, index, index % 2 === 0);
        setFunctionModule(index, 6, index % 2 === 0);
    }

    const alignment = ALIGNMENT_POSITIONS[version];
    for (const centerRow of alignment) {
        for (const centerColumn of alignment) {
            const overlapsFinder = (centerRow === 6 && centerColumn === 6) || (centerRow === 6 && centerColumn === size - 7) || (centerRow === size - 7 && centerColumn === 6);
            if (overlapsFinder) continue;
            for (let rowOffset = -2; rowOffset <= 2; rowOffset++) {
                for (let columnOffset = -2; columnOffset <= 2; columnOffset++) {
                    const distance = Math.max(Math.abs(rowOffset), Math.abs(columnOffset));
                    setFunctionModule(centerRow + rowOffset, centerColumn + columnOffset, distance !== 1);
                }
            }
        }
    }

    // Reserve the format areas (filled per mask later) and the dark module.
    for (let index = 0; index < 9; index++) { reserved[8][index] = true; reserved[index][8] = true; }
    for (let index = 0; index < 8; index++) { reserved[8][size - 1 - index] = true; reserved[size - 1 - index][8] = true; }
    setFunctionModule(size - 8, 8, true);

    if (version >= 7) {
        const bits = versionBits(version);
        for (let bit = 0; bit < 18; bit++) {
            const dark = ((bits >> bit) & 1) === 1;
            setFunctionModule(Math.floor(bit / 3), size - 11 + (bit % 3), dark);
            setFunctionModule(size - 11 + (bit % 3), Math.floor(bit / 3), dark);
        }
    }
    return { size, modules, reserved };
}

function placeData(base, codewords) {
    const { size, modules, reserved } = base;
    const bits = [];
    codewords.forEach((codeword) => { for (let bit = 7; bit >= 0; bit--) bits.push((codeword >> bit) & 1); });
    const dataModules = [];
    let upward = true;
    for (let column = size - 1; column > 0; column -= 2) {
        if (column === 6) column = 5;
        for (let step = 0; step < size; step++) {
            const row = upward ? size - 1 - step : step;
            for (const columnOffset of [0, 1]) {
                const targetColumn = column - columnOffset;
                if (!reserved[row][targetColumn]) dataModules.push([row, targetColumn]);
            }
        }
        upward = !upward;
    }
    return dataModules.map(([row, column], index) => ({ row, column, dark: (bits[index] ?? 0) === 1 }));
}

function applyMask(base, dataPlacements, maskIndex) {
    const { size, modules, reserved } = base;
    const result = modules.map((row) => row.slice());
    dataPlacements.forEach(({ row, column, dark }) => { result[row][column] = dark !== MASKS[maskIndex](row, column); });
    const bits = formatBits(maskIndex);
    const placeFormatBit = (row, column, dark) => { result[row][column] = dark; };
    for (let bit = 0; bit < 15; bit++) {
        const dark = ((bits >> bit) & 1) === 1;
        // first copy around the top-left finder
        if (bit < 6) placeFormatBit(bit, 8, dark);
        else if (bit < 8) placeFormatBit(bit + 1, 8, dark);
        else if (bit === 8) placeFormatBit(8, 7, dark);
        else placeFormatBit(8, 14 - bit, dark);
        // second copy split between the other two finders
        if (bit < 8) placeFormatBit(8, size - 1 - bit, dark);
        else placeFormatBit(size - 15 + bit, 8, dark);
    }
    return result;
}

function penaltyScore(modules) {
    const size = modules.length;
    let score = 0;
    const scoreLine = (line) => {
        let lineScore = 0;
        let runLength = 1;
        for (let index = 1; index <= line.length; index++) {
            if (index < line.length && line[index] === line[index - 1]) { runLength++; continue; }
            if (runLength >= 5) lineScore += 3 + (runLength - 5);
            runLength = 1;
        }
        const asText = line.map((dark) => (dark ? "1" : "0")).join("");
        for (const pattern of ["10111010000", "00001011101"]) {
            let from = 0;
            while ((from = asText.indexOf(pattern, from)) !== -1) { lineScore += 40; from++; }
        }
        return lineScore;
    };
    for (let row = 0; row < size; row++) score += scoreLine(modules[row]);
    for (let column = 0; column < size; column++) score += scoreLine(modules.map((row) => row[column]));
    for (let row = 0; row < size - 1; row++) {
        for (let column = 0; column < size - 1; column++) {
            const value = modules[row][column];
            if (value === modules[row][column + 1] && value === modules[row + 1][column] && value === modules[row + 1][column + 1]) score += 3;
        }
    }
    const darkCount = modules.flat().filter(Boolean).length;
    score += Math.floor(Math.abs((darkCount * 100) / (size * size) - 50) / 5) * 10;
    return score;
}

export function encodeQr(text) {
    const textBytes = [...new TextEncoder().encode(text)];
    let version = 1;
    const capacityOf = (candidate) => BLOCK_LAYOUT[candidate][1].reduce((sum, [count, size]) => sum + count * size, 0) - (candidate < 10 ? 2 : 3);
    while (version <= MAX_VERSION && textBytes.length > capacityOf(version)) version++;
    if (version > MAX_VERSION) throw new Error(`Text of ${textBytes.length} bytes does not fit a version ${MAX_VERSION} QR code`);

    const base = buildBaseMatrix(version);
    const dataPlacements = placeData(base, buildCodewords(textBytes, version));
    let best = null;
    for (let maskIndex = 0; maskIndex < 8; maskIndex++) {
        const candidate = applyMask(base, dataPlacements, maskIndex);
        const score = penaltyScore(candidate);
        if (!best || score < best.score) best = { score, modules: candidate };
    }
    return best.modules;
}

// SVG with a 4-module white quiet zone, so it scans on a dark theme too. One path of row runs.
export function qrToSvg(modules, { title = "" } = {}) {
    const size = modules.length;
    const quietZone = 4;
    let pathData = "";
    modules.forEach((row, rowIndex) => {
        let column = 0;
        while (column < size) {
            if (!row[column]) { column++; continue; }
            let runEnd = column;
            while (runEnd < size && row[runEnd]) runEnd++;
            pathData += `M${column + quietZone} ${rowIndex + quietZone}h${runEnd - column}v1h-${runEnd - column}z`;
            column = runEnd;
        }
    });
    const total = size + quietZone * 2;
    const titleElement = title ? `<title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total * 4}" height="${total * 4}" shape-rendering="crispEdges" role="img">${titleElement}<rect width="${total}" height="${total}" fill="#fff"/><path d="${pathData}" fill="#000"/></svg>\n`;
}
