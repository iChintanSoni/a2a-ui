"use client";

import { useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";
import { CheckIcon, CopyIcon } from "lucide-react";

function CodeBlock({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const text = preRef.current?.textContent ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div className="group relative mb-2">
      <pre
        ref={preRef}
        className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-sm leading-relaxed"
      >
        {children}
      </pre>
      <button
        onClick={copy}
        aria-label="Copy code"
        className="text-muted-foreground hover:bg-background hover:text-foreground absolute top-2 right-2 hidden rounded p-1 transition-colors group-hover:flex"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-green-500" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}

const components: Components = {
  // Headings
  h1: ({ children }) => <h1 className="mt-4 mb-2 text-2xl leading-tight font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-2 text-xl leading-tight font-bold">{children}</h2>,
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1 text-lg leading-tight font-semibold">{children}</h3>
  ),
  h4: ({ children }) => <h4 className="mt-2 mb-1 text-base font-semibold">{children}</h4>,
  h5: ({ children }) => <h5 className="mt-2 mb-1 text-sm font-semibold">{children}</h5>,
  h6: ({ children }) => (
    <h6 className="text-muted-foreground mt-2 mb-1 text-sm font-medium">{children}</h6>
  ),

  // Paragraphs
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,

  // Lists
  ul: ({ children }) => (
    <ul className="mb-2 list-outside list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-outside list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Inline code
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  },

  // Code blocks — wrapped with copy button
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-border text-muted-foreground my-2 border-l-4 pl-4 italic">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),

  // Horizontal rule
  hr: () => <hr className="border-border my-3" />,

  // Strong / emphasis
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Strikethrough (GFM)
  del: ({ children }) => <del className="text-muted-foreground line-through">{children}</del>,

  // Tables (GFM) — wrapped in overflow-x-auto for narrow viewports
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-border border-b">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2">{children}</td>,

  // Images
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} className="my-2 max-w-full rounded border" />
  ),
};

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
