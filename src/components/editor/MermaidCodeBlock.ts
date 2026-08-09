"use client";

import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockWithMermaid } from "./MermaidBlock";

export const CodeBlockWithMermaidExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockWithMermaid);
  },
});