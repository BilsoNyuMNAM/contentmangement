import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
    content: string;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code", err);
        }
    };

    return (
        <div className="relative my-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-neutral-100 overflow-hidden shadow-xs group">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950/70 text-xs font-mono text-neutral-400">
                <span className="uppercase tracking-wider font-semibold text-[11px] text-neutral-300">
                    {language || "code"}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-sans hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy code"
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
                <code>{code}</code>
            </pre>
        </div>
    );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="markdown-content max-w-4xl mx-auto px-4 sm:px-8 py-8 text-neutral-900 dark:text-neutral-100 leading-relaxed font-sans">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-8 mb-3 text-neutral-900 dark:text-neutral-100">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg sm:text-xl font-semibold tracking-tight mt-6 mb-2 text-neutral-800 dark:text-neutral-200">
                            {children}
                        </h3>
                    ),
                    p: ({ children }) => (
                        <p className="my-3.5 text-[15px] sm:text-base leading-7 text-neutral-700 dark:text-neutral-300">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-outside pl-6 my-3 space-y-1 text-[15px] sm:text-base text-neutral-700 dark:text-neutral-300">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-outside pl-6 my-3 space-y-1 text-[15px] sm:text-base text-neutral-700 dark:text-neutral-300">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500/80 pl-4 py-2 my-5 rounded-r-xl bg-indigo-50/50 dark:bg-indigo-950/20 text-neutral-700 dark:text-neutral-300 italic text-[15px]">
                            {children}
                        </blockquote>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <table className="w-full text-left text-sm border-collapse">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-800 dark:text-neutral-200">
                            {children}
                        </thead>
                    ),
                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {children}
                        </tbody>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                            {children}
                        </tr>
                    ),
                    th: ({ children }) => <th className="px-4 py-2.5 font-semibold text-xs tracking-wider uppercase">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{children}</td>,
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target={href?.startsWith("http") ? "_blank" : undefined}
                            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 hover:text-indigo-500 transition-colors"
                        >
                            {children}
                        </a>
                    ),
                    hr: () => <hr className="my-8 border-neutral-200 dark:border-neutral-800" />,
                    code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match && !String(children).includes("\n");

                        if (isInline) {
                            return (
                                <code
                                    className="px-1.5 py-0.5 rounded-md text-[13px] font-mono font-medium bg-neutral-200/60 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border border-neutral-300/40 dark:border-neutral-700/50"
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }

                        const codeText = String(children).replace(/\n$/, "");
                        return <CodeBlock language={match ? match[1] : ""} code={codeText} />;
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
