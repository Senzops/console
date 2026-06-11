import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/components/Core';
import { Copy, Check } from 'lucide-react';

function CodeBlock({
  inline,
  className,
  children,
  ...props
}: any) {
  const [copied, setCopied] = React.useState(false);
  const lang = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code
        className="px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40 text-[13px] font-mono text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className={cn('font-mono', className)} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const components: Record<string, React.FC<any>> = {
  code: CodeBlock,
  table: ({ children, ...props }: any) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
      <table
        className="w-full text-sm border-collapse"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-muted/40" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: any) => (
    <th
      className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td
      className="px-3 py-2 text-sm text-foreground border-b border-border/30"
      {...props}
    >
      {children}
    </td>
  ),
  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline underline-offset-2"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, ...props }: any) => (
    <h1 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-base font-bold mt-3 mb-1.5 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-sm font-bold mt-2.5 mb-1 text-foreground" {...props}>
      {children}
    </h3>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc pl-5 my-1.5 space-y-0.5 text-sm" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal pl-5 my-1.5 space-y-0.5 text-sm" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-sm text-foreground leading-relaxed" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }: any) => (
    <p className="text-sm text-foreground leading-relaxed my-1.5" {...props}>
      {children}
    </p>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote
      className="border-l-2 border-primary/40 pl-3 my-2 text-sm italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props: any) => (
    <hr className="my-3 border-border/50" {...props} />
  ),
};

export function AssistantMarkdown({ content }: { content: string }) {
  const plugins = useMemo(() => [remarkGfm], []);

  return (
    <div className="prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
