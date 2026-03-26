import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-4 mb-2 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-3 mb-2 leading-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-3 mb-1 leading-tight">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mt-2 mb-1">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-medium mt-2 mb-1 text-muted-foreground">{children}</h6>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),

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
        className="bg-muted text-foreground rounded px-1 py-0.5 text-[0.85em] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },

  // Code blocks
  pre: ({ children }) => (
    <pre className="bg-muted rounded-md p-3 overflow-x-auto text-sm font-mono mb-2 leading-relaxed">
      {children}
    </pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground my-2">
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
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Strikethrough (GFM)
  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),

  // Tables (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2">{children}</td>
  ),

  // Images
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} className="max-w-full rounded border my-2" />
  ),
};

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="min-w-0">
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
