"use client";

import { Mark, markInputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      /** Insert a wiki-link mark spanning the given title text. */
      setWikiLink: (title: string) => ReturnType;
    };
  }
}

export const WikiLink = Mark.create<{ onClickLink?: (title: string) => void }>({
  name: "wikiLink",

  priority: 1000,

  addOptions() {
    return { onClickLink: undefined };
  },

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-wiki-title") ?? "",
        renderHTML: (attrs) => ({ "data-wiki-title": attrs.title as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-title]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        class:
          "wiki-link text-accent underline underline-offset-2 cursor-pointer transition-opacity hover:opacity-70",
      },
      0,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (title: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { title }),
    };
  },

  /**
   * Input rule: as soon as the user finishes typing `[[Title]]` (with the
   * closing `]]`), the text is wrapped in the wikiLink mark automatically.
   */
  addInputRules() {
    return [
      markInputRule({
        find: /\[\[([^\[\]\n]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => ({ title: match[1] }),
      }),
    ];
  },
});
