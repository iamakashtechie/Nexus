"use client";

import { useMemo, createElement, Fragment, type ReactNode } from "react";
import { getLowlight } from "@/lib/highlight";

type CodeBlockProps = {
  language?: string;
  code: string;
  className?: string;
};

const LOWLIGHT = getLowlight();

function normalizeLanguage(lang: string | undefined): string | null {
  if (!lang) return null;
  const lower = lang.toLowerCase().trim();
  if (!lower || lower === "text" || lower === "plain" || lower === "txt") return null;
  if (LOWLIGHT.registered(lower)) return lower;
  return null;
}

function prettyLanguage(lang: string): string {
  const map: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    py: "Python",
    python: "Python",
    bash: "Bash",
    sh: "Shell",
    shell: "Shell",
    zsh: "Zsh",
    css: "CSS",
    cpp: "C++",
    "c++": "C++",
    c: "C",
    h: "C++",
    java: "Java",
    go: "Go",
    golang: "Go",
    rust: "Rust",
    rs: "Rust",
    json: "JSON",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML",
    xml: "HTML",
    html: "HTML",
    markdown: "Markdown",
    md: "Markdown",
  };
  return map[lang.toLowerCase()] ?? lang.toUpperCase();
}

type HastNode = {
  type: "root" | "element" | "text";
  tagName?: string;
  properties?: { className?: string[] } & Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

function renderHast(node: HastNode, keyPrefix = ""): ReactNode {
  if (!node) return null;
  if (node.type === "text") return node.value ?? "";
  if (node.type === "element" && node.tagName) {
    const className = (node.properties?.className ?? []).join(" ");
    const props: Record<string, unknown> = {};
    if (className) props.className = className;
    const childNodes = (node.children ?? []).map((child, i) =>
      renderHast(child, `${keyPrefix}-${i}`)
    );
    return createElement(node.tagName, props, ...childNodes);
  }
  if (node.type === "root") {
    return (node.children ?? []).map((child, i) => (
      <Fragment key={`${keyPrefix}-${i}`}>{renderHast(child, `${keyPrefix}-${i}`)}</Fragment>
    ));
  }
  return null;
}

export function CodeBlock({ language, code, className }: CodeBlockProps) {
  const normalized = normalizeLanguage(language);
  const tree = useMemo(() => {
    const text = (code ?? "").replace(/\n$/, "");
    if (!normalized) {
      const fallback: HastNode = { type: "text", value: text };
      return { type: "root" as const, children: [fallback] };
    }
    try {
      return LOWLIGHT.highlight(normalized, text) as unknown as HastNode;
    } catch {
      const fallback: HastNode = { type: "text", value: text };
      return { type: "root" as const, children: [fallback] };
    }
  }, [normalized, code]);

  return (
    <CodeBlockShell
      languageLabel={normalized ? prettyLanguage(normalized) : "Text"}
      languageClass={normalized ?? "text"}
      className={className}
    >
      <code className={`hljs language-${normalized ?? "text"}`}>
        {renderHast(tree, "r")}
      </code>
    </CodeBlockShell>
  );
}

function CodeBlockShell({
  languageLabel,
  languageClass,
  className,
  children,
}: {
  languageLabel: string;
  languageClass: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`code-block-shell relative my-4 group/codeblock ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 py-1.5 rounded-t-xl bg-[var(--code-header-bg)] border border-b-0 border-[var(--code-border)] text-[11px] uppercase tracking-wider text-[var(--code-muted)] font-semibold transition-colors">
        <span>{languageLabel}</span>
        <span className="text-[10px] opacity-75 normal-case tracking-normal">
          {languageClass}
        </span>
      </div>
      <pre
        className="hljs-pre !mt-0 !rounded-t-none"
        data-language={languageClass}
      >
        {children}
      </pre>
    </div>
  );
}
