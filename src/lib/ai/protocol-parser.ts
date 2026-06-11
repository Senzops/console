// ============================================================================
// ReAct XML Protocol Parser — Streaming, Single-Pass
// ============================================================================
//
// Parses the agent's XML-tagged output incrementally as chunks arrive from the
// LLM stream. Emits structured events for thinking, tool_calls, and answer
// blocks. Designed for local models (WebLLM) that don't support native tool
// calling — cloud providers use NativeToolAgent instead.
//
// Protocol per turn:
//   <thinking>...</thinking><tool_calls>[{name, arguments}, ...]</tool_calls>
//   <thinking>...</thinking><answer>...markdown...</answer>

import type { ParseEvent, ParsedToolCall } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROTOCOL_TAGS = {
  THINKING_OPEN: '<thinking>',
  THINKING_CLOSE: '</thinking>',
  TOOL_CALLS_OPEN: '<tool_calls>',
  TOOL_CALLS_CLOSE: '</tool_calls>',
  ANSWER_OPEN: '<answer>',
  ANSWER_CLOSE: '</answer>',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip a non-empty proper prefix of `closeTag` from the end of `body`.
 * Guards against stop-sequence truncation where the engine cuts mid-token.
 */
export function stripTrailingPartialCloseTag(
  body: string,
  closeTag: string,
): string {
  for (let i = closeTag.length - 1; i >= 1; i--) {
    const partial = closeTag.slice(0, i);
    if (body.endsWith(partial)) {
      return body.slice(0, body.length - partial.length).trimEnd();
    }
  }
  return body;
}

/**
 * Find the first balanced JSON array in `text`. String-aware (respects
 * backslash escapes inside JSON strings). O(n), no regex backtracking.
 */
export function extractFirstJsonArray(text: string): string | null {
  const start = text.indexOf('[');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Salvage tool calls emitted inside markdown ```json fences instead of
 * <tool_calls>. Some instruction-tuned models default to markdown.
 */
export function extractMarkdownToolCalls(
  text: string,
): ParsedToolCall[] | null {
  if (!text) return null;
  const fenceRe = /```(?:\s*[a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)\s*```/g;
  const acc: ParsedToolCall[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    const inner = m[1];
    const arrText = extractFirstJsonArray(inner);
    if (!arrText) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(arrText);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    for (const c of parsed) {
      if (
        c &&
        typeof c === 'object' &&
        typeof c.name === 'string' &&
        c.name.length > 0
      ) {
        acc.push({
          name: c.name,
          arguments:
            c.arguments && typeof c.arguments === 'object'
              ? c.arguments
              : {},
        });
      }
    }
  }
  return acc.length > 0 ? acc : null;
}

// ---------------------------------------------------------------------------
// Tag Stripper — sanitizes leaked protocol tags from answer content
// ---------------------------------------------------------------------------

const TAG_PATTERN =
  /<\/?(?:thinking|tool_calls|answer|observations)>|(?:^|\n)\s*(?:User|Assistant):\s*/gi;

export class TagStripper {
  private buffer = '';
  private emitted = '';
  private readonly safeMargin = 20;

  feed(chunk: string): string {
    this.buffer += chunk;
    if (this.buffer.length <= this.safeMargin) return '';
    const safe = this.buffer.slice(0, -this.safeMargin);
    this.buffer = this.buffer.slice(-this.safeMargin);
    const cleaned = safe.replace(TAG_PATTERN, '');
    this.emitted += cleaned;
    return cleaned;
  }

  flush(): string {
    const cleaned = this.buffer.replace(TAG_PATTERN, '');
    this.emitted += cleaned;
    this.buffer = '';
    return cleaned;
  }

  getEmitted(): string {
    return this.emitted;
  }
}

// ---------------------------------------------------------------------------
// Sanitize plain text — strip all protocol noise
// ---------------------------------------------------------------------------

export function sanitizeFinalAnswerText(raw: string): string {
  if (!raw) return '';
  let out = raw;
  for (const tag of Object.values(PROTOCOL_TAGS)) {
    out = out.replaceAll(tag, '');
  }
  out = out.replace(/<\/?observations>/g, '');
  out = out.replace(/(?:^|\n)\s*(?:User|Assistant):\s*/g, '\n');
  out = out.replace(
    /\[(?:Your\s+turn|System\s+(?:then|supplies|will|provides))[^\]]*\]/gi,
    '',
  );
  out = out.replace(
    /---\s*(?:BEGIN|END)\s+REFERENCE\s*---/gi,
    '',
  );
  return out.trim();
}

// ---------------------------------------------------------------------------
// ProtocolParser — incremental streaming parser
// ---------------------------------------------------------------------------

type ParserState = 'idle' | 'thinking' | 'tool_calls' | 'answer';

export class ProtocolParser {
  private state: ParserState = 'idle';
  private buffer = '';
  private bodyStart = 0;

  getState(): ParserState {
    return this.state;
  }

  feed(chunk: string): ParseEvent[] {
    this.buffer += chunk;
    const events: ParseEvent[] = [];
    let safety = 50;

    while (safety-- > 0) {
      if (this.state === 'idle') {
        const ti = this.buffer.indexOf(PROTOCOL_TAGS.THINKING_OPEN);
        const ai = this.buffer.indexOf(PROTOCOL_TAGS.ANSWER_OPEN);
        const tci = this.buffer.indexOf(PROTOCOL_TAGS.TOOL_CALLS_OPEN);

        const first = Math.min(
          ti >= 0 ? ti : Infinity,
          ai >= 0 ? ai : Infinity,
          tci >= 0 ? tci : Infinity,
        );
        if (first === Infinity) break;

        if (first === ti) {
          this.state = 'thinking';
          this.buffer = this.buffer.slice(
            ti + PROTOCOL_TAGS.THINKING_OPEN.length,
          );
          this.bodyStart = 0;
        } else if (first === tci) {
          this.state = 'tool_calls';
          this.buffer = this.buffer.slice(
            tci + PROTOCOL_TAGS.TOOL_CALLS_OPEN.length,
          );
          this.bodyStart = 0;
        } else {
          this.state = 'answer';
          this.buffer = this.buffer.slice(
            ai + PROTOCOL_TAGS.ANSWER_OPEN.length,
          );
          this.bodyStart = 0;
        }
        continue;
      }

      if (this.state === 'thinking') {
        const close = this.buffer.indexOf(PROTOCOL_TAGS.THINKING_CLOSE);
        if (close >= 0) {
          const text = this.buffer.slice(0, close);
          if (text.length > 0) {
            events.push({ kind: 'thinking_delta', text });
          }
          events.push({ kind: 'thinking_end' });
          this.buffer = this.buffer.slice(
            close + PROTOCOL_TAGS.THINKING_CLOSE.length,
          );
          this.state = 'idle';
          continue;
        }
        const safe = Math.max(
          0,
          this.buffer.length - PROTOCOL_TAGS.THINKING_CLOSE.length,
        );
        if (safe > this.bodyStart) {
          events.push({
            kind: 'thinking_delta',
            text: this.buffer.slice(this.bodyStart, safe),
          });
          this.bodyStart = safe;
        }
        break;
      }

      if (this.state === 'tool_calls') {
        const close = this.buffer.indexOf(PROTOCOL_TAGS.TOOL_CALLS_CLOSE);
        if (close >= 0) {
          let body = this.buffer.slice(0, close).trim();
          body = stripTrailingPartialCloseTag(
            body,
            PROTOCOL_TAGS.TOOL_CALLS_CLOSE,
          );
          this.buffer = this.buffer.slice(
            close + PROTOCOL_TAGS.TOOL_CALLS_CLOSE.length,
          );
          this.state = 'idle';
          events.push(...this.parseToolCallsBody(body));
          continue;
        }
        break;
      }

      if (this.state === 'answer') {
        const close = this.buffer.indexOf(PROTOCOL_TAGS.ANSWER_CLOSE);
        if (close >= 0) {
          const text = this.buffer.slice(0, close);
          if (text.length > this.bodyStart) {
            events.push({
              kind: 'answer_delta',
              text: text.slice(this.bodyStart),
            });
          }
          events.push({ kind: 'answer_end' });
          this.buffer = this.buffer.slice(
            close + PROTOCOL_TAGS.ANSWER_CLOSE.length,
          );
          this.state = 'idle';
          continue;
        }
        const safe = Math.max(
          0,
          this.buffer.length - PROTOCOL_TAGS.ANSWER_CLOSE.length,
        );
        if (safe > this.bodyStart) {
          events.push({
            kind: 'answer_delta',
            text: this.buffer.slice(this.bodyStart, safe),
          });
          this.bodyStart = safe;
        }
        break;
      }
    }

    return events;
  }

  flush(): ParseEvent[] {
    const events: ParseEvent[] = [];
    if (this.state === 'thinking') {
      if (this.buffer.length > this.bodyStart) {
        events.push({
          kind: 'thinking_delta',
          text: this.buffer.slice(this.bodyStart),
        });
      }
      events.push({ kind: 'thinking_end' });
    } else if (this.state === 'answer') {
      if (this.buffer.length > this.bodyStart) {
        events.push({
          kind: 'answer_delta',
          text: this.buffer.slice(this.bodyStart),
        });
      }
      events.push({ kind: 'answer_end' });
    } else if (this.state === 'tool_calls') {
      let body = this.buffer.trim();
      body = stripTrailingPartialCloseTag(
        body,
        PROTOCOL_TAGS.TOOL_CALLS_CLOSE,
      );
      events.push(...this.parseToolCallsBody(body));
    }
    this.state = 'idle';
    this.buffer = '';
    this.bodyStart = 0;
    return events;
  }

  private parseToolCallsBody(body: string): ParseEvent[] {
    const arrayText = extractFirstJsonArray(body);
    if (!arrayText) {
      return [
        {
          kind: 'tool_calls_error',
          raw: body,
          error: 'No JSON array found in <tool_calls> body.',
        },
      ];
    }
    try {
      const parsed = JSON.parse(arrayText);
      if (!Array.isArray(parsed)) {
        return [
          {
            kind: 'tool_calls_error',
            raw: body,
            error: 'Parsed value is not an array.',
          },
        ];
      }
      const calls: ParsedToolCall[] = [];
      for (const item of parsed) {
        if (
          item &&
          typeof item === 'object' &&
          typeof item.name === 'string'
        ) {
          calls.push({
            name: item.name,
            arguments:
              item.arguments && typeof item.arguments === 'object'
                ? item.arguments
                : {},
          });
        }
      }
      return [{ kind: 'tool_calls', calls }];
    } catch (err: any) {
      return [
        {
          kind: 'tool_calls_error',
          raw: body,
          error: err?.message || 'JSON parse error',
        },
      ];
    }
  }
}
