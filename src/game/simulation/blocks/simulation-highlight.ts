import { PALETTE } from "#root/src/game/palette.ts";

export const COLORS = {
  text: PALETTE.syntax.text,
  keyword: PALETTE.syntax.keyword,
  string: PALETTE.syntax.string,
  number: PALETTE.syntax.number,
  comment: PALETTE.syntax.comment,
  punctuation: PALETTE.syntax.punctuation,
  magic: PALETTE.particles.magic,
};

const CODE_KEYWORDS = new Set([
  "async",
  "await",
  "function",
  "return",
  "const",
  "let",
  "class",
  "private",
  "new",
  "extends",
  "infer",
  "type",
  "export",
  "default",
  "for",
  "any",
  "true",
  "false",
  "null",
  "undefined",
]);

function quotedTokenEnd(line: string, start: number): number {
  for (let end = start + 1; end < line.length; end++) {
    if (line[end] === "\\") {
      end++;
    } else if (line[end] === line[start]) {
      return end + 1;
    }
  }

  return start + 1;
}

function highlightWord(line: string, start: number) {
  let end = start + 1;

  while (end < line.length && /\w/.test(line[end]!)) {
    end++;
  }

  const token = line.slice(start, end);
  let color: string = COLORS.text;

  if (CODE_KEYWORDS.has(token)) {
    color = COLORS.keyword;
  } else if (/^\d+$/.test(token)) {
    color = COLORS.number;
  }

  return { end, color };
}

function highlightQuote(line: string, start: number) {
  const end = quotedTokenEnd(line, start);

  return { end, color: end > start + 1 ? COLORS.string : COLORS.text };
}

function highlightToken(line: string, start: number) {
  if (line.startsWith("//", start)) {
    return { end: line.length, color: COLORS.comment };
  }

  if (line[start] === '"' || line[start] === "'") {
    return highlightQuote(line, start);
  }

  if (/\w/.test(line[start]!)) {
    return highlightWord(line, start);
  }

  if (/[{}()[\];.,?:=+!<>|]/.test(line[start]!)) {
    return { end: start + 1, color: COLORS.punctuation };
  }

  return { end: start + 1, color: COLORS.text };
}

/** Scan once so malformed code strings cannot trigger regex backtracking. */
export function highlightLine(line: string): string[] {
  const colors: string[] = Array.from(
    { length: line.length },
    () => COLORS.text,
  );
  let start = 0;

  while (start < line.length) {
    const { end, color } = highlightToken(line, start);

    colors.fill(color, start, end);
    start = end;
  }

  return colors;
}
