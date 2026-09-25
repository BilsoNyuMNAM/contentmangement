import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Prism from "prismjs";

// Common language grammars
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-css";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

interface MarkdownRendererProps {
    content: string;
    chapterTitle?: string;
    isDark?: boolean;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function highlightCode(code: string, language: string): string {
    if (!code) return "";
    const cleanLang = (language || "").toLowerCase().trim();
    const langMap: Record<string, string> = {
        js: "javascript",
        jsx: "jsx",
        ts: "typescript",
        tsx: "tsx",
        sh: "bash",
        bash: "bash",
        shell: "bash",
        zsh: "bash",
        py: "python",
        python: "python",
        json: "json",
        sql: "sql",
        css: "css",
        yaml: "yaml",
        yml: "yaml",
        html: "markup",
        xml: "markup",
        md: "markdown",
        markdown: "markdown",
        rust: "rust",
        rs: "rust",
        go: "go",
        java: "java",
        c: "c",
        cpp: "cpp",
        prisma: "javascript"
    };

    const prismLang = langMap[cleanLang] || cleanLang;
    const grammar = Prism.languages[prismLang] || Prism.languages.javascript || Prism.languages.markup;

    try {
        if (grammar) {
            return Prism.highlight(code, grammar, prismLang);
        }
    } catch {
        // Fallback to escaped HTML if Prism parser fails
    }

    return escapeHtml(code);
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

    const highlighted = highlightCode(code, language);

    return (
        <div className="notion-code group">
            <button
                type="button"
                onClick={handleCopy}
                className="notion-code-copy"
                title="Copy code"
            >
                {copied ? "Copied" : "Copy"}
            </button>
            <pre>
                <code
                    className={language ? `language-${language}` : "language-text"}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                />
            </pre>
        </div>
    );
}

export default function MarkdownRenderer({ content, chapterTitle, isDark = true }: MarkdownRendererProps) {
    // Strip YAML frontmatter if present at the top
    const cleanContent = (content || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();

    // Check if markdown content starts with an H1 heading (e.g. "# What is Caching")
    const hasLeadingH1 = /^\s*#[^#\n]+/.test(cleanContent);
    const shouldRenderTopTitle = !hasLeadingH1 && Boolean(chapterTitle?.trim());

    let renderedFirstH1 = false;

    return (
        <div className={`notion ${isDark ? "dark-mode" : ""} notion-full-page`}>
            <main className="notion-page-content">
                {shouldRenderTopTitle && (
                    <h1 className="notion-title">
                        {chapterTitle}
                    </h1>
                )}
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({ children }) => {
                            if (hasLeadingH1 && !renderedFirstH1) {
                                renderedFirstH1 = true;
                                return (
                                    <h1 className="notion-title">
                                        {children}
                                    </h1>
                                );
                            }
                            return (
                                <h1 className="notion-h notion-h1 notion-h-title">
                                    {children}
                                </h1>
                            );
                        },
                        h2: ({ children }) => (
                            <h2 className="notion-h notion-h2 notion-h-title">
                                {children}
                            </h2>
                        ),
                        h3: ({ children }) => (
                            <h3 className="notion-h notion-h3 notion-h-title">
                                {children}
                            </h3>
                        ),
                        h4: ({ children }) => (
                            <h4 className="notion-h notion-h4 notion-h-title">
                                {children}
                            </h4>
                        ),
                        p: ({ children }) => (
                            <p className="notion-text">
                                {children}
                            </p>
                        ),
                        strong: ({ children }) => (
                            <strong className="font-semibold text-neutral-100 dark:text-[#ededed]">
                                {children}
                            </strong>
                        ),
                        b: ({ children }) => (
                            <b className="font-semibold text-neutral-100 dark:text-[#ededed]">
                                {children}
                            </b>
                        ),
                        ul: ({ children }) => (
                            <ul className="notion-list notion-list-disc list-disc pl-6 my-3">
                                {children}
                            </ul>
                        ),
                        ol: ({ children }) => (
                            <ol className="notion-list notion-list-numbered list-decimal pl-6 my-3">
                                {children}
                            </ol>
                        ),
                        li: ({ children }) => <li>{children}</li>,
                        blockquote: ({ children }) => (
                            <blockquote className="notion-quote">
                                {children}
                            </blockquote>
                        ),
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-6">
                                <table className="notion-simple-table">
                                    {children}
                                </table>
                            </div>
                        ),
                        thead: ({ children }) => (
                            <thead>
                                {children}
                            </thead>
                        ),
                        tbody: ({ children }) => (
                            <tbody>
                                {children}
                            </tbody>
                        ),
                        tr: ({ children }) => (
                            <tr>
                                {children}
                            </tr>
                        ),
                        th: ({ children }) => <th className="notion-table-header">{children}</th>,
                        td: ({ children }) => <td className="notion-table-cell">{children}</td>,
                        a: ({ href, children }) => (
                            <a
                                href={href}
                                target={href?.startsWith("http") ? "_blank" : undefined}
                                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                                className="notion-link"
                            >
                                {children}
                            </a>
                        ),
                        hr: () => <hr className="notion-hr" />,
                        img: ({ src, alt }: any) => (
                            <div className="notion-asset-wrapper">
                                <img src={src} alt={alt || ""} loading="lazy" />
                                {alt && <div className="notion-asset-caption">{alt}</div>}
                            </div>
                        ),
                        code: ({ node, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !String(children).includes("\n");

                            if (isInline) {
                                return (
                                    <code className="notion-inline-code" {...props}>
                                        {children}
                                    </code>
                                );
                            }

                            const codeText = String(children).replace(/\n$/, "");
                            return <CodeBlock language={match ? match[1] : ""} code={codeText} />;
                        }
                    }}
                >
                    {cleanContent}
                </ReactMarkdown>
            </main>
        </div>
    );
}
