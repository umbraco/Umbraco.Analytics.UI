// Build-only Vite plugin: shrinks the static text of our `css` and `html` tagged templates, which the JavaScript
// minifier leaves alone. Keeps the bundle inside the gzip budget that `check:size` enforces.
// - css: drops comments and turns every run of whitespace into one space (text inside quotes is kept as is).
// - html: turns a run of whitespace that holds a line break into one line break. Same rendering, since our
//   templates never set `white-space: pre`. Whitespace on a single line, as in attribute values, is kept.
// Line breaks are kept (a comment or a run keeps its line breaks), so every line stays where it was and the
// source maps stay right without a new map.
import type { Plugin } from "vite";

const TAGS = new Set(["css", "html"]);

// The parts of an ESTree node this plugin reads.
interface Node {
    type: string;
    [key: string]: unknown;
}
interface TemplateElement {
    start: number;
    end: number;
    value: { raw: string };
}
interface Edit {
    start: number;
    end: number;
    text: string;
}

const lineBreaks = (text: string) => text.replace(/[^\n]/g, "");

export function minifyCss(text: string): string {
    let out = "";
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (ch === '"' || ch === "'") {
            let end = i + 1;
            while (end < text.length && text[end] !== ch && text[end] !== "\n") end += text[end] === "\\" ? 2 : 1;
            out += text.slice(i, end + 1);
            i = end + 1;
        } else if (ch === "/" && text[i + 1] === "*") {
            const end = text.indexOf("*/", i + 2);
            const close = end === -1 ? text.length : end + 2;
            out += lineBreaks(text.slice(i, close)) || " ";
            i = close;
        } else if (/\s/.test(ch)) {
            let end = i;
            while (end < text.length && /\s/.test(text[end])) end++;
            out += lineBreaks(text.slice(i, end)) || " ";
            i = end;
        } else {
            out += ch;
            i++;
        }
    }
    // A comment next to whitespace leaves a space beside a line break; one of them is enough.
    return out.replace(/ *\n */g, "\n").replace(/ {2,}/g, " ");
}

export function minifyHtml(text: string): string {
    return text.replace(/\s*\n\s*/g, (run) => lineBreaks(run));
}

export function minifyTemplates(): Plugin {
    return {
        name: "uaui:minify-templates",
        apply: "build",
        transform(code: string, id: string) {
            if (!/\/src\/.*\.ts$/.test(id) || !/\b(css|html)`/.test(code)) return null;
            const edits: Edit[] = [];
            const visit = (node: Node) => {
                if (typeof node.type !== "string") return;
                const tag = node.tag as Node | undefined;
                if (node.type === "TaggedTemplateExpression" && tag?.type === "Identifier" && TAGS.has(tag.name as string)) {
                    const minify = tag.name === "css" ? minifyCss : minifyHtml;
                    for (const quasi of (node.quasi as { quasis: TemplateElement[] }).quasis) {
                        const raw = code.slice(quasi.start, quasi.end);
                        if (raw !== quasi.value.raw) throw new Error(`[minify-templates] Unexpected template position in ${id}`);
                        const small = minify(raw);
                        if (small !== raw) edits.push({ start: quasi.start, end: quasi.end, text: small });
                    }
                }
                for (const key in node) {
                    const value = node[key];
                    if (Array.isArray(value)) value.forEach((child) => child && typeof child === "object" && visit(child as Node));
                    else if (value && typeof value === "object" && key !== "parent") visit(value as Node);
                }
            };
            visit(this.parse(code) as unknown as Node);
            if (!edits.length) return null;
            let out = code;
            for (const edit of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
            // Every line stays in place, so the existing source map still fits.
            return { code: out, map: null };
        },
    };
}
