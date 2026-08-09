"use client";

import { useState } from "react";
import { Plus, Trash2, FileText, Copy } from "lucide-react";
import { toast } from "sonner";

export type NoteTemplate = {
  id: string;
  name: string;
  description?: string;
  title: string;
  fileType: ".md" | string;
  markdownContent?: string;
  content?: object;
};

const STORAGE_KEY = "nexus:templates:v1";

const BUILTIN_TEMPLATES: NoteTemplate[] = [
  {
    id: "builtin-daily",
    name: "Daily Note",
    description: "Date-stamped journal entry with sections for plans, log, and reflections.",
    title: "{{date}}",
    fileType: ".md",
    markdownContent: `# {{date}}

## Plans
- 

## Log

## Reflections

`,
  },
  {
    id: "builtin-meeting",
    name: "Meeting",
    description: "Capture attendees, agenda, decisions, and action items.",
    title: "Meeting Notes",
    fileType: ".md",
    markdownContent: `# Meeting Notes

**Date:** {{date}}
**Attendees:** 

## Agenda

## Discussion

## Decisions

## Action Items
- [ ] 

`,
  },
  {
    id: "builtin-blank",
    name: "Blank Note",
    description: "An empty starting point.",
    title: "Untitled",
    fileType: ".md",
    markdownContent: "",
  },
];

function loadUserTemplates(): NoteTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveUserTemplates(templates: NoteTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* ignore quota errors */
  }
}

export function listTemplates(): NoteTemplate[] {
  return [...BUILTIN_TEMPLATES, ...loadUserTemplates()];
}

export function applyTemplatePlaceholders(text: string): string {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const pretty = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return text
    .replace(/\{\{date\}\}/g, iso)
    .replace(/\{\{today\}\}/g, pretty);
}

export function getTemplateById(id: string): NoteTemplate | null {
  return listTemplates().find((t) => t.id === id) ?? null;
}

type TemplateManagerProps = {
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
};

export function TemplateManager({ onClose, onSelectTemplate }: TemplateManagerProps) {
  const [userTemplates, setUserTemplates] = useState<NoteTemplate[]>(() =>
    loadUserTemplates()
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<NoteTemplate>>({});

  const persist = (next: NoteTemplate[]) => {
    setUserTemplates(next);
    saveUserTemplates(next);
  };

  const startNew = () => {
    setEditingId("new");
    setDraft({
      name: "New Template",
      title: "Untitled",
      fileType: ".md",
      markdownContent: "",
      description: "",
    });
  };

  const startEdit = (t: NoteTemplate) => {
    setEditingId(t.id);
    setDraft({ ...t });
  };

  const saveDraft = () => {
    if (!draft.name) {
      toast.error("Template name required");
      return;
    }
    if (editingId === "new") {
      const id = `user-${Date.now()}`;
      persist([
        ...userTemplates,
        { ...(draft as NoteTemplate), id, markdownContent: draft.markdownContent ?? "" },
      ]);
    } else if (editingId) {
      persist(
        userTemplates.map((t) =>
          t.id === editingId ? ({ ...t, ...draft } as NoteTemplate) : t
        )
      );
    }
    setEditingId(null);
    setDraft({});
    toast.success("Template saved");
  };

  const remove = (id: string) => {
    persist(userTemplates.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success("Template removed");
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-bg/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Templates"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="text-sm font-medium text-text flex items-center gap-2">
            <FileText size={14} /> Templates
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text text-xs"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editingId ? (
            <TemplateEditor
              draft={draft}
              onChange={setDraft}
              onSave={saveDraft}
              onCancel={() => {
                setEditingId(null);
                setDraft({});
              }}
            />
          ) : (
            <>
              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-muted/70 mb-2">
                  Built-in
                </h4>
                <div className="space-y-1.5">
                  {BUILTIN_TEMPLATES.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      onSelect={() => {
                        onSelectTemplate(t);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </section>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted/70">
                    Your templates
                  </h4>
                  <button
                    type="button"
                    onClick={startNew}
                    className="text-[11px] text-text hover:underline flex items-center gap-1"
                  >
                    <Plus size={11} /> New
                  </button>
                </div>
                {userTemplates.length === 0 ? (
                  <p className="text-[11px] text-muted/70 italic">
                    No custom templates yet. Create one to reuse note structures.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {userTemplates.map((t) => (
                      <TemplateRow
                        key={t.id}
                        template={t}
                        onSelect={() => {
                          onSelectTemplate(t);
                          onClose();
                        }}
                        onEdit={() => startEdit(t)}
                        onRemove={() => remove(t.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  onSelect,
  onEdit,
  onRemove,
}: {
  template: NoteTemplate;
  onSelect: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 px-3 py-2 rounded-md bg-bg/40 border border-border/40 hover:border-border transition-colors">
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left min-w-0"
      >
        <div className="text-[13px] text-text font-medium truncate">
          {template.name}
        </div>
        {template.description && (
          <div className="text-[11px] text-muted/80 truncate">
            {template.description}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onSelect}
        title="Use template"
        className="text-muted hover:text-text p-1.5 rounded-md hover:bg-surface-hover"
      >
        <Copy size={12} />
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-muted hover:text-text p-1.5 rounded-md hover:bg-surface-hover text-[11px]"
        >
          Edit
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted hover:text-red-400 p-1.5 rounded-md hover:bg-surface-hover"
          aria-label={`Remove ${template.name}`}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function TemplateEditor({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Partial<NoteTemplate>;
  onChange: (next: Partial<NoteTemplate>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          type="text"
          value={draft.name ?? ""}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="w-full px-2.5 py-1.5 text-[13px] bg-bg border border-border rounded-md outline-none focus:border-accent text-text"
        />
      </Field>
      <Field label="Description (optional)">
        <input
          type="text"
          value={draft.description ?? ""}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          className="w-full px-2.5 py-1.5 text-[13px] bg-bg border border-border rounded-md outline-none focus:border-accent text-text"
        />
      </Field>
      <Field label="Default title">
        <input
          type="text"
          value={draft.title ?? ""}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          className="w-full px-2.5 py-1.5 text-[13px] bg-bg border border-border rounded-md outline-none focus:border-accent text-text"
        />
      </Field>
      <Field label="Body (markdown)">
        <textarea
          value={draft.markdownContent ?? ""}
          onChange={(e) =>
            onChange({ ...draft, markdownContent: e.target.value })
          }
          rows={10}
          className="w-full px-2.5 py-2 text-[12px] font-mono bg-bg border border-border rounded-md outline-none focus:border-accent text-text resize-none"
          placeholder="Use {{date}} or {{today}} for date placeholders."
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-muted hover:text-text rounded-md hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-3 py-1.5 text-xs font-medium bg-text text-bg rounded-md hover:opacity-90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-muted/70 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
