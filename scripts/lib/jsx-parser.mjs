/**
 * jsx-parser.mjs — parser JSX minimal compartido entre check-primitives.mjs
 * y audit-design-system.mjs.
 *
 * Encuentra bloques JSX que abren con <Tag (p. ej. "Modal", "DataTable") y
 * resuelve el opening-tag completo manejando arrow functions (`=>`) dentro de
 * props via balance de llaves `{` `}`.
 *
 * Output: { start, end, openingText, blockText } por cada ocurrencia. `start`
 * y `end` son 1-indexed line numbers.
 */

export function findJsxBlocks(content, openingTag) {
  const lines = content.split("\n");
  const blocks = [];
  const openRe = new RegExp(`^\\s*<${openingTag}(\\s|>|$)`);
  const closeTagRe = new RegExp(`</${openingTag}>`);

  for (let i = 0; i < lines.length; i++) {
    if (!openRe.test(lines[i])) continue;

    let chars = "";
    for (let k = i; k < lines.length; k++) chars += lines[k] + "\n";

    let braces = 0;
    let openingEndIdx = -1;
    const prefix = `<${openingTag}`;
    const startPrefix = chars.indexOf(prefix);
    for (let p = startPrefix + prefix.length; p < chars.length; p++) {
      const c = chars[p];
      if (c === "{") braces++;
      else if (c === "}") braces--;
      else if (c === ">" && braces === 0) {
        openingEndIdx = p;
        break;
      }
    }
    if (openingEndIdx === -1) continue;

    const openingText = chars.slice(startPrefix, openingEndIdx + 1);
    const selfClosing = chars[openingEndIdx - 1] === "/";
    const openingLines = openingText.split("\n").length;
    const openingStartLine = i + 1;
    const openingEndLine = i + openingLines;

    let closeLine = openingEndLine;
    if (!selfClosing) {
      for (let k = openingEndLine; k < lines.length; k++) {
        if (closeTagRe.test(lines[k])) {
          closeLine = k + 1;
          break;
        }
      }
    }
    const blockText = lines.slice(i, closeLine).join("\n");
    blocks.push({ start: openingStartLine, end: closeLine, openingText, blockText });
  }
  return blocks;
}
