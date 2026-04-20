const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type LogoDimensions = {
  width: number;
  height: number;
} | null;

export type LogoOptimizationResult = {
  buffer: Buffer;
  contentType: "image/png" | "image/svg+xml";
  extension: "png" | "svg";
};

function hasPngSignature(buffer: Buffer): boolean {
  if (buffer.length < PNG_SIGNATURE.length) {
    return false;
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      return false;
    }
  }
  return true;
}

export function readPngDimensions(buffer: Buffer): LogoDimensions {
  if (!hasPngSignature(buffer) || buffer.length < 24) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) {
    return null;
  }
  return { width, height };
}

export function readSvgDimensions(svg: string): LogoDimensions {
  const viewBox = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      const width = Math.abs(parts[2]);
      const height = Math.abs(parts[3]);
      if (width && height) {
        return { width, height };
      }
    }
  }

  const widthMatch = svg.match(/\swidth\s*=\s*"(\d+(?:\.\d+)?)(?:px)?"/i);
  const heightMatch = svg.match(/\sheight\s*=\s*"(\d+(?:\.\d+)?)(?:px)?"/i);
  if (widthMatch && heightMatch) {
    const width = Number.parseFloat(widthMatch[1]);
    const height = Number.parseFloat(heightMatch[1]);
    if (width && height) {
      return { width, height };
    }
  }

  return null;
}

export function minifySvg(svg: string): string {
  let output = svg;
  output = output.replace(/<!--[\s\S]*?-->/g, "");
  output = output.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  output = output.replace(/<title[\s\S]*?<\/title>/gi, "");
  output = output.replace(/<desc[\s\S]*?<\/desc>/gi, "");
  output = output.replace(/<script[\s\S]*?<\/script>/gi, "");
  output = output.replace(/\s(sodipodi|inkscape):[a-zA-Z-]+\s*=\s*"[^"]*"/g, "");
  output = output.replace(/\sxmlns:(sodipodi|inkscape)\s*=\s*"[^"]*"/g, "");
  output = output.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  output = output.replace(/>\s+</g, "><");
  output = output.replace(/\s{2,}/g, " ");
  return output.trim();
}

export function optimizePngBuffer(buffer: Buffer): Buffer {
  return buffer;
}

export function optimizeSvgBuffer(buffer: Buffer): Buffer {
  const minified = minifySvg(buffer.toString("utf8"));
  return Buffer.from(minified, "utf8");
}
