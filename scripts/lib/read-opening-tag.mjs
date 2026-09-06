/**
 * Reads a JSX opening tag without treating `=>` or `>` inside `{...}` as the tag end.
 */
export function readOpeningTag(lines, startIndex, maxLines = 40) {
  let chunk = '';
  let cursor = startIndex;
  let expressionDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let started = false;

  while (cursor < lines.length && cursor - startIndex < maxLines) {
    const line = lines[cursor];
    chunk += cursor === startIndex ? line : `\n${line}`;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const previous = index > 0 ? line[index - 1] : '';

      if (!started) {
        if (char === '<') {
          started = true;
        }
        continue;
      }

      if (inSingle) {
        if (char === "'" && previous !== '\\') {
          inSingle = false;
        }
        continue;
      }
      if (inDouble) {
        if (char === '"' && previous !== '\\') {
          inDouble = false;
        }
        continue;
      }
      if (inTemplate) {
        if (char === '`' && previous !== '\\') {
          inTemplate = false;
        }
        continue;
      }

      if (char === "'") {
        inSingle = true;
        continue;
      }
      if (char === '"') {
        inDouble = true;
        continue;
      }
      if (char === '`') {
        inTemplate = true;
        continue;
      }

      if (char === '{') {
        expressionDepth += 1;
        continue;
      }
      if (char === '}') {
        expressionDepth = Math.max(0, expressionDepth - 1);
        continue;
      }

      if (char === '>' && expressionDepth === 0) {
        return { chunk, endIndex: cursor };
      }
    }

    cursor += 1;
  }

  return { chunk, endIndex: Math.max(startIndex, cursor - 1) };
}
