"use client";

import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";

let _lowlight: ReturnType<typeof createLowlight> | null = null;

export function getLowlight() {
  if (_lowlight) return _lowlight;
  const lowlight = createLowlight();
  lowlight.register("javascript", javascript);
  lowlight.register("js", javascript);
  lowlight.register("typescript", typescript);
  lowlight.register("ts", typescript);
  lowlight.register("python", python);
  lowlight.register("py", python);
  lowlight.register("bash", bash);
  lowlight.register("sh", bash);
  lowlight.register("shell", bash);
  lowlight.register("zsh", bash);
  lowlight.register("css", css);
  lowlight.register("cpp", cpp);
  lowlight.register("c++", cpp);
  lowlight.register("c", c);
  lowlight.register("h", cpp);
  lowlight.register("java", java);
  lowlight.register("go", go);
  lowlight.register("golang", go);
  lowlight.register("rust", rust);
  lowlight.register("rs", rust);
  lowlight.register("json", json);
  lowlight.register("sql", sql);
  lowlight.register("yaml", yaml);
  lowlight.register("yml", yaml);
  lowlight.register("xml", xml);
  lowlight.register("html", xml);
  lowlight.register("markdown", markdown);
  lowlight.register("md", markdown);
  _lowlight = lowlight;
  return lowlight;
}

export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "bash",
  "css",
  "cpp",
  "c",
  "java",
  "go",
  "rust",
  "json",
  "sql",
  "yaml",
  "xml",
  "html",
  "markdown",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
