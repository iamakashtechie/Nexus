"use client";

import { useEffect, useState } from "react";
import { NodeViewWrapper, NodeViewProps, NodeViewContent } from "@tiptap/react";
import mermaid from "mermaid";

let mermaidInitialized = false;

function ensureMermaidInit(theme: "light" | "dark" | "default" = "default") {
  if (mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict" });
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "strict",
    fontFamily: "var(--font-geist-sans)",
  });
  mermaidInitialized = true;
}

function readColorScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const html = document.documentElement;
  if (html.classList.contains("dark") || html.classList.contains("dim")) {
    return "dark";
  }
  return "light";
}

export function CodeBlockWithMermaid(props: NodeViewProps) {
  const { node } = props;
  const language = (node.attrs.language as string | null) ?? "";
  const isMermaid = language === "mermaid";
  const code = String(node.textContent ?? "").trim();
  const [id] = useState(
    () => `mermaid-${Math.random().toString(36).slice(2, 9)}`
  );
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (!isMermaid) return;
    let cancelled = false;
    async function render() {
      if (!code) {
        setSvg("");
        setError(null);
        return;
      }
      try {
        ensureMermaidInit(
          readColorScheme() === "dark" ? "dark" : "default"
        );
        const { svg: rendered } = await mermaid.render(
          `${id}-${Date.now()}`,
          code
        );
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Render failed");
          setSvg("");
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [code, isMermaid, id]);

  if (isMermaid) {
    return (
      <NodeViewWrapper className="mermaid-wrapper">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Mermaid Diagram
          </span>
        </div>
        <div className="mermaid-content" contentEditable={false}>
          {error ? (
            <pre className="text-xs text-red-500 whitespace-pre-wrap font-mono">
              {error}
            </pre>
          ) : svg ? (
            <div
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="text-xs text-muted italic">Rendering diagram…</div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <pre className="hljs-pre">
        <NodeViewContent as="div" />
      </pre>
    </NodeViewWrapper>
  );
}

export function MermaidDiagram({ code }: { code: string }) {
  const [id] = useState(
    () => `mermaid-${Math.random().toString(36).slice(2, 9)}`
  );
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!code.trim()) {
        setSvg("");
        setError(null);
        return;
      }
      try {
        ensureMermaidInit(readColorScheme() === "dark" ? "dark" : "default");
        const { svg: rendered } = await mermaid.render(
          `${id}-${Date.now()}`,
          code.trim()
        );
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Render failed");
          setSvg("");
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return (
    <div className="mermaid-wrapper my-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">
          Mermaid Diagram
        </span>
      </div>
      <div className="mermaid-content">
        {error ? (
          <pre className="text-xs text-red-500 whitespace-pre-wrap font-mono p-2 bg-red-500/10 rounded-lg">
            {error}
          </pre>
        ) : svg ? (
          <div
            className="flex justify-center overflow-x-auto p-2"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-xs text-muted italic">Rendering diagram…</div>
        )}
      </div>
    </div>
  );
}