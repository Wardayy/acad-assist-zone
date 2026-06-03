// Tiny zero-dep markdown-ish renderer (headings, bold, italics, code, lists, paragraphs)
import { type JSX } from "react";

function inline(s: string) {
  // escape
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-foreground/90 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: JSX.Element[] = [];
  let list: string[] | null = null;
  let i = 0;
  const flushList = () => {
    if (list) {
      out.push(
        <ul key={`ul-${i}`} className="list-disc pl-6 space-y-1 my-2">
          {list.map((li, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: inline(li) }} />
          ))}
        </ul>,
      );
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    i++;
    if (!line.trim()) { flushList(); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const lvl = h[1].length;
      const Tag = (`h${Math.min(lvl + 1, 6)}`) as keyof JSX.IntrinsicElements;
      out.push(<Tag key={i} className={`font-display font-bold mt-4 mb-2 ${lvl === 1 ? "text-2xl" : lvl === 2 ? "text-xl" : "text-lg"}`} dangerouslySetInnerHTML={{ __html: inline(h[2]) }} />);
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { (list ||= []).push(li[1]); continue; }
    flushList();
    out.push(<p key={i} className="my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(line) }} />);
  }
  flushList();
  return <div className="prose-sm">{out}</div>;
}
