import { useState, useEffect, useCallback, type FormEvent, type ReactNode, type SyntheticEvent } from "react";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronUp, GripVertical,
  IndianRupee, Star, StarOff, Eye, X, Check,
  BookOpen, Users, Lightbulb, Workflow, UserCircle, HelpCircle,
  Layers, AlertTriangle, Loader2, RefreshCw, ArrowLeft, ExternalLink,
  Copy, LayoutDashboard
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanValidityLabel } from "@/lib/planValidity";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanFeature {
  _id?: string;
  title: string;
  description: string;
}

interface Plan {
  _id?: string;
  id: string;
  name: string;
  tagline: string;
  target: string;
  price: number;
  popular: boolean;
  order: number;
  validityMode: "fixed_date" | "duration";
  fixedExpiryDate?: string | null;
  validityValue?: number | null;
  validityUnit?: "months" | "years" | null;
  mockTests: PlanFeature[];
  counseling: PlanFeature[];
  benefits: PlanFeature[];
  howItWorks: PlanFeature[];
  personas: PlanFeature[];
  faqs: PlanFeature[];
}

interface ApiErrorResponse {
  message?: string;
}

type SectionKey = "mockTests" | "counseling" | "benefits" | "howItWorks" | "personas" | "faqs";

interface FeatureEditorProps {
  feature: PlanFeature;
  onChange: (feature: PlanFeature) => void;
  onDelete: () => void;
  index: number;
}

interface SectionBlockProps {
  sectionKey: SectionKey;
  items: PlanFeature[];
  onChange: (nextItems: PlanFeature[]) => void;
}

interface PlanFormProps {
  initial: Plan | Omit<Plan, "_id">;
  onSave: (nextPlan: Plan | Omit<Plan, "_id">) => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew: boolean;
}

const SECTION_META: Record<SectionKey, { label: string; icon: ReactNode; color: string; hint: string }> = {
  mockTests:  { label: "Mock Tests & Practice",    icon: <BookOpen className="w-4 h-4" />,    color: "blue",   hint: "Describe what test features are included" },
  counseling: { label: "Counseling & Guidance",    icon: <Users className="w-4 h-4" />,       color: "violet", hint: "Describe admission tools and guidance services" },
  benefits:   { label: "Why Choose This Plan",     icon: <Lightbulb className="w-4 h-4" />,   color: "amber",  hint: "Key selling points and benefits" },
  howItWorks: { label: "How It Works (Steps)",     icon: <Workflow className="w-4 h-4" />,    color: "emerald",hint: "Step-by-step process — shown as a timeline" },
  personas:   { label: "Who Is This For?",         icon: <UserCircle className="w-4 h-4" />,  color: "rose",   hint: "Describe the target student profiles" },
  faqs:       { label: "FAQs",                     icon: <HelpCircle className="w-4 h-4" />,  color: "slate",  hint: "Common questions — title = Question, description = Answer" },
};

const SECTION_COLORS: Record<string, string> = {
  blue:    "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  violet:  "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300",
  amber:   "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300",
  rose:    "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300",
  slate:   "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/30 dark:border-slate-700 dark:text-slate-300",
};

const emptyPlan = (): Omit<Plan, "_id"> => ({
  id: "", name: "", tagline: "", target: "", price: 0, popular: false, order: 0,
  validityMode: "duration", fixedExpiryDate: null, validityValue: 12, validityUnit: "months",
  mockTests: [], counseling: [], benefits: [], howItWorks: [], personas: [], faqs: [],
});

const toInputDate = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

// ─── Feature Item Editor ───────────────────────────────────────────────────────

function FeatureEditor({
  feature, onChange, onDelete, index,
}: FeatureEditorProps) {
  return (
    <div className="group relative flex gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-center text-muted-foreground/40 cursor-grab shrink-0 mt-1">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <input
          className="w-full text-sm font-semibold bg-transparent border-0 border-b border-dashed border-border focus:border-primary focus:outline-none px-0 py-1 text-foreground placeholder:text-muted-foreground/50 transition-colors"
          placeholder={`Title / Heading ${index + 1}`}
          value={feature.title}
          onChange={(e) => onChange({ ...feature, title: e.target.value })}
        />
        <textarea
          className="w-full text-sm bg-transparent border-0 border-b border-dashed border-border focus:border-primary focus:outline-none px-0 py-1 text-muted-foreground placeholder:text-muted-foreground/50 resize-none transition-colors leading-relaxed"
          placeholder="Description / explanation..."
          rows={2}
          value={feature.description}
          onChange={(e) => onChange({ ...feature, description: e.target.value })}
        />
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 self-start mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove item"
        aria-label={`Remove item ${index + 1}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Section Block ─────────────────────────────────────────────────────────────

function SectionBlock({
  sectionKey, items, onChange,
}: SectionBlockProps) {
  const [open, setOpen] = useState(true);
  const meta = SECTION_META[sectionKey];
  const colorCls = SECTION_COLORS[meta.color];
  const contentId = `${sectionKey}-section-content`;

  const addItem = () => onChange([...items, { title: "", description: "" }]);
  const updateItem = (i: number, f: PlanFeature) => onChange(items.map((x, idx) => idx === i ? f : x));
  const deleteItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    setOpen(event.currentTarget.open);
  };

  return (
    <details
      open={open}
      onToggle={handleToggle}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
    >
      <summary
        aria-label={`${open ? "Collapse" : "Expand"} ${meta.label} section`}
        className="flex list-none items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors cursor-pointer [&::-webkit-details-marker]:hidden"
      >
        <div className={`p-2 rounded-lg border ${colorCls} shrink-0`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{meta.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.hint}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </summary>

      {open && (
        <div id={contentId} className="px-5 pb-5 space-y-3 border-t border-border/60 pt-4">
          {items.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No items yet — click "Add Item" to add one
            </div>
          )}
          {items.map((item, i) => (
            <FeatureEditor
              key={i}
              index={i}
              feature={item}
              onChange={(f) => updateItem(i, f)}
              onDelete={() => deleteItem(i)}
            />
          ))}
          <button
            type="button"
            onClick={addItem}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm font-medium transition-all hover:shadow-sm ${colorCls} hover:opacity-80`}
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      )}
    </details>
  );
}

// ─── Plan Form ─────────────────────────────────────────────────────────────────

function PlanForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  isNew,
}: PlanFormProps) {
  const [form, setForm] = useState<Plan | Omit<Plan, "_id">>(initial);
  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const sections: SectionKey[] = ["mockTests", "counseling", "benefits", "howItWorks", "personas", "faqs"];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/20">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Plan Details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Plan Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Plan Name *</label>
            <input
              required
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="e.g. Foundation Plan"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Plan ID (slug) */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Plan ID <span className="text-[10px] normal-case font-normal">(URL slug — lowercase, no spaces)</span>
            </label>
            <input
              required
              pattern="[a-z0-9\-]+"
              title="Only lowercase letters, numbers, and hyphens"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="e.g. foundation"
              value={form.id}
              onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Price (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                required
                type="number"
                min={0}
                className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                placeholder="e.g. 999"
                value={form.price || ""}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tagline *</label>
            <input
              required
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Short persuasive subtitle shown on the plan card"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </div>

          {/* Target */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Perfect For (Target Audience)</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="e.g. Students just starting their prep"
              value={form.target}
              onChange={(e) => set("target", e.target.value)}
            />
          </div>

          {/* Order & Popular */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Display Order</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="0 = first"
              value={form.order}
              onChange={(e) => set("order", Number(e.target.value))}
            />
          </div>

          {/* Popular toggle */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Popular Badge</label>
            <button
              type="button"
              onClick={() => set("popular", !form.popular)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                form.popular
                  ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {form.popular ? <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> : <StarOff className="w-4 h-4" />}
              {form.popular ? "Marked as Popular" : "Not Popular"}
            </button>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Access Validity
                </label>
                <p className="text-xs text-muted-foreground">
                  Choose a fixed expiry date or a duration from the purchase date.
                </p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {formatPlanValidityLabel(form)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Validity Type
                </label>
                <select
                  value={form.validityMode}
                  onChange={(e) => set("validityMode", e.target.value)}
                  aria-label="Plan validity mode"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="fixed_date">Fixed expiry date</option>
                  <option value="duration">Duration from purchase</option>
                </select>
              </div>

              {form.validityMode === "fixed_date" ? (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={toInputDate(form.fixedExpiryDate)}
                    onChange={(e) => set("fixedExpiryDate", e.target.value || null)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Duration
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.validityValue || 1}
                      onChange={(e) => set("validityValue", Number(e.target.value))}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Unit
                    </label>
                    <select
                      value={form.validityUnit || "months"}
                      onChange={(e) => set("validityUnit", e.target.value)}
                      aria-label="Plan validity unit"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section editors */}
      <div className="space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
          <Layers className="w-4 h-4" /> Content Sections
        </h3>
        {sections.map((key) => (
          <SectionBlock
            key={key}
            sectionKey={key}
            items={(form as Plan)[key] as PlanFeature[]}
            onChange={(items) => set(key, items)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm hover:shadow-md"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isSaving ? "Saving…" : isNew ? "Create Plan" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ─── Plan Card (in the list view) ─────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const previewSections: SectionKey[] = ["mockTests", "counseling", "faqs"];

  const totalItems =
    plan.mockTests.length + plan.counseling.length + plan.benefits.length +
    plan.howItWorks.length + plan.personas.length + plan.faqs.length;

  return (
    <div className={`relative rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all group overflow-hidden ${plan.popular ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
      {plan.popular && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-primary to-violet-400" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-foreground text-base leading-tight">{plan.name}</h3>
              {plan.popular && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Popular
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{plan.tagline}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-extrabold text-foreground">₹{plan.price.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">one-time</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 flex-wrap mb-4">
          {previewSections.map((key) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md border ${SECTION_COLORS[SECTION_META[key].color]}`}>
                {SECTION_META[key].icon}
              </span>
              <span className="font-medium text-foreground">{plan[key].length}</span>
              <span>{SECTION_META[key].label.split(" ")[0]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Layers className="w-3.5 h-3.5" />
            <span>{totalItems} total items</span>
          </div>
        </div>

        {/* Target */}
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-4 line-clamp-1">
          🎯 {plan.target || "No target audience set"}
        </p>
        <p className="text-xs font-medium text-primary mb-4">
          {formatPlanValidityLabel(plan)}
        </p>

        {/* Actions */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400 flex-1">Delete this plan permanently?</p>
            <button onClick={onDelete} className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">Yes</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors">No</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Plan
            </button>
            <a
              href={`/plan/${plan.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
              title="Preview plan page"
              aria-label={`Preview ${plan.name} page`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onDuplicate}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
              title="Duplicate plan"
              aria-label={`Duplicate ${plan.name}`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Delete plan"
              aria-label={`Delete ${plan.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type View = "list" | "edit" | "create";

export default function PlanManager() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<View>("list");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/plans");
      setPlans(data.plans || []);
    } catch {
      toast({ title: "Failed to load plans", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreate = async (formData: Plan | Omit<Plan, "_id">) => {
    setIsSaving(true);
    try {
      await api.post("/plans", formData);
      toast({ title: "✅ Plan created successfully!" });
      setView("list");
      fetchPlans();
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err as AxiosError<ApiErrorResponse>).response?.data?.message || "Failed to create plan"
          : "Failed to create plan";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (formData: Plan | Omit<Plan, "_id">) => {
    if (!editingPlan) return;
    setIsSaving(true);
    try {
      await api.put(`/plans/${editingPlan.id}`, formData);
      toast({ title: "✅ Plan updated successfully!" });
      setView("list");
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err as AxiosError<ApiErrorResponse>).response?.data?.message || "Failed to update plan"
          : "Failed to update plan";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await api.delete(`/plans/${planId}`);
      toast({ title: "Plan deleted" });
      setPlans((p) => p.filter((x) => x.id !== planId));
    } catch {
      toast({ title: "Failed to delete plan", variant: "destructive" });
    }
  };

  const handleDuplicate = async (plan: Plan) => {
    const newId = `${plan.id}-copy-${Date.now().toString(36)}`;
    const duplicate = {
      ...plan,
      _id: undefined,
      id: newId,
      name: `${plan.name} (Copy)`,
      popular: false,
      order: plan.order + 1,
    };
    try {
      await api.post("/plans", duplicate);
      toast({ title: "Plan duplicated!" });
      fetchPlans();
    } catch {
      toast({ title: "Failed to duplicate plan", variant: "destructive" });
    }
  };

  const startEdit = (plan: Plan) => { setEditingPlan(plan); setView("edit"); };
  const cancelForm = () => { setView("list"); setEditingPlan(null); };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalRevenuePotential = plans.reduce((s, p) => s + p.price, 0);
  const popularCount = plans.filter((p) => p.popular).length;
  const avgPrice = plans.length ? Math.round(plans.reduce((s, p) => s + p.price, 0) / plans.length) : 0;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (view === "create" || view === "edit") {
    const initial = view === "edit" && editingPlan ? editingPlan : emptyPlan();
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
        {/* Back header */}
        <div className="flex items-center justify-between">
          <button
            onClick={cancelForm}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Plans
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${view === "create" ? "bg-emerald-400" : "bg-blue-400"}`} />
            <h2 className="text-lg font-bold text-foreground">
              {view === "create" ? "Create New Plan" : `Editing: ${editingPlan?.name}`}
            </h2>
          </div>
        </div>

        <PlanForm
          initial={initial}
          onSave={view === "create" ? handleCreate : handleUpdate}
          onCancel={cancelForm}
          isSaving={isSaving}
          isNew={view === "create"}
        />
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <LayoutDashboard className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Plan Manager</h1>
            <p className="text-sm text-muted-foreground">Manage counselling plans, pricing, and content shown to students</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Plans",         value: plans.length,                         icon: <Layers className="w-4 h-4" />,       color: "blue" },
          { label: "Popular Plans",        value: popularCount,                          icon: <Star className="w-4 h-4" />,         color: "amber" },
          { label: "Average Price",        value: `₹${avgPrice.toLocaleString()}`,       icon: <IndianRupee className="w-4 h-4" />,  color: "emerald" },
          { label: "Combined Price Pool",  value: `₹${totalRevenuePotential.toLocaleString()}`, icon: <Layers className="w-4 h-4" />, color: "violet" },
        ].map((stat) => (
          <Card key={stat.label} className={`hover:shadow-md transition-all border-l-4 ${stat.color === "blue" ? "border-l-blue-500" : stat.color === "amber" ? "border-l-amber-400" : stat.color === "emerald" ? "border-l-emerald-500" : "border-l-violet-500"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <span className="text-muted-foreground">{stat.icon}</span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plans grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading plans…</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Layers className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">No plans yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first counselling plan to get started</p>
          </div>
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...plans].sort((a, b) => a.order - b.order).map((plan) => (
            <PlanCard
              key={plan._id || plan.id}
              plan={plan}
              onEdit={() => startEdit(plan)}
              onDelete={() => handleDelete(plan.id)}
              onDuplicate={() => handleDuplicate(plan)}
            />
          ))}
        </div>
      )}

      {/* Info bar */}
      {plans.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 border border-border/60">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          Changes are <strong className="text-foreground">live instantly</strong> — students see updated plans and pricing in real time on the services page.
        </div>
      )}
    </div>
  );
}
