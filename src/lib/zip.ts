const textEncoder = new TextEncoder();

type ZipEntryInput = {
  name: string;
  content: Uint8Array;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(view: DataView, offset: number, value: number): number {
  view.setUint16(offset, value, true);
  return offset + 2;
}

function writeU32(view: DataView, offset: number, value: number): number {
  view.setUint32(offset, value, true);
  return offset + 4;
}

function createTimestampParts(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;

  return { dosTime, dosDate };
}

export function createZip(entries: ZipEntryInput[]): Uint8Array {
  const timestamp = createTimestampParts();
  const fileParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = textEncoder.encode(entry.name);
    const fileData = entry.content;
    const crc = crc32(fileData);

    const localHeader = new Uint8Array(30 + fileName.length);
    const localView = new DataView(localHeader.buffer);
    let cursor = 0;

    cursor = writeU32(localView, cursor, 0x04034b50);
    cursor = writeU16(localView, cursor, 20);
    cursor = writeU16(localView, cursor, 0);
    cursor = writeU16(localView, cursor, 0);
    cursor = writeU16(localView, cursor, timestamp.dosTime);
    cursor = writeU16(localView, cursor, timestamp.dosDate);
    cursor = writeU32(localView, cursor, crc);
    cursor = writeU32(localView, cursor, fileData.length);
    cursor = writeU32(localView, cursor, fileData.length);
    cursor = writeU16(localView, cursor, fileName.length);
    cursor = writeU16(localView, cursor, 0);
    localHeader.set(fileName, cursor);

    fileParts.push(localHeader, fileData);

    const centralHeader = new Uint8Array(46 + fileName.length);
    const centralView = new DataView(centralHeader.buffer);
    cursor = 0;

    cursor = writeU32(centralView, cursor, 0x02014b50);
    cursor = writeU16(centralView, cursor, 20);
    cursor = writeU16(centralView, cursor, 20);
    cursor = writeU16(centralView, cursor, 0);
    cursor = writeU16(centralView, cursor, 0);
    cursor = writeU16(centralView, cursor, timestamp.dosTime);
    cursor = writeU16(centralView, cursor, timestamp.dosDate);
    cursor = writeU32(centralView, cursor, crc);
    cursor = writeU32(centralView, cursor, fileData.length);
    cursor = writeU32(centralView, cursor, fileData.length);
    cursor = writeU16(centralView, cursor, fileName.length);
    cursor = writeU16(centralView, cursor, 0);
    cursor = writeU16(centralView, cursor, 0);
    cursor = writeU16(centralView, cursor, 0);
    cursor = writeU16(centralView, cursor, 0);
    cursor = writeU32(centralView, cursor, 0);
    cursor = writeU32(centralView, cursor, offset);
    centralHeader.set(fileName, cursor);

    centralParts.push(centralHeader);
    offset += localHeader.length + fileData.length;
  }

  const centralOffset = offset;
  for (const part of centralParts) {
    offset += part.length;
  }
  const centralSize = offset - centralOffset;

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  let cursor = 0;
  cursor = writeU32(eocdView, cursor, 0x06054b50);
  cursor = writeU16(eocdView, cursor, 0);
  cursor = writeU16(eocdView, cursor, 0);
  cursor = writeU16(eocdView, cursor, entries.length);
  cursor = writeU16(eocdView, cursor, entries.length);
  cursor = writeU32(eocdView, cursor, centralSize);
  cursor = writeU32(eocdView, cursor, centralOffset);
  writeU16(eocdView, cursor, 0);

  const output = new Uint8Array(offset + eocd.length);
  let outOffset = 0;
  for (const part of fileParts) {
    output.set(part, outOffset);
    outOffset += part.length;
  }
  for (const part of centralParts) {
    output.set(part, outOffset);
    outOffset += part.length;
  }
  output.set(eocd, outOffset);

  return output;
}
