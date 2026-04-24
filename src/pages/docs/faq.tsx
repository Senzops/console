import { useState, useMemo } from "react";
import { DocsLayout } from "../../components/DocsLayout";
import { DocHeader, DocSection } from "../../components/DocsUI";
import { DOCS_DATA } from "../../static/docsData";
import { cn } from "../../components/Core";
import { Search, ChevronDown, Mail, FileText } from "lucide-react";

// --- Enterprise Accordion Component ---
const FaqAccordionItem = ({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={cn(
        "border border-border/40 rounded-xl overflow-hidden transition-colors duration-200",
        isOpen
          ? "bg-card shadow-sm border-border"
          : "bg-card/50 hover:bg-card hover:border-border/80",
      )}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
      >
        <span className="text-sm md:text-base font-semibold text-foreground pr-4">
          {question}
        </span>
        <div
          className={cn(
            "w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0 transition-transform duration-300",
            isOpen
              ? "rotate-180 bg-primary/10 text-primary"
              : "text-muted-foreground",
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/30 mt-2 pt-4">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DocsFaq() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  // Real-time search filter
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_DATA.faqs;

    const lowerQuery = searchQuery.toLowerCase();

    return DOCS_DATA.faqs
      .map((category) => {
        const filteredQuestions = category.questions.filter(
          (q) =>
            q.q.toLowerCase().includes(lowerQuery) ||
            q.a.toLowerCase().includes(lowerQuery),
        );
        return { ...category, questions: filteredQuestions };
      })
      .filter((category) => category.questions.length > 0);
  }, [searchQuery]);

  return (
    <DocsLayout>
      <DocHeader
        title="Frequently Asked Questions"
        description="Detailed answers regarding data privacy, ingestion limits, billing, and platform capabilities."
      />

      {/* --- Enterprise Search Bar --- */}
      <div className="mb-10 relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <input
          type="text"
          placeholder="Search for answers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-card border border-border/60 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-sm placeholder:text-muted-foreground/50"
        />
        {searchQuery && (
          <div className="absolute top-full left-0 mt-2 text-xs text-muted-foreground">
            Showing results for "
            <span className="text-foreground font-medium">{searchQuery}</span>"
          </div>
        )}
      </div>

      {/* --- FAQ Accordions --- */}
      <div className="space-y-12 min-h-[400px]">
        {filteredFaqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-xl bg-card/30">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-bold text-foreground">
              No matching questions found
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn't find any FAQs matching your search. Please try
              different keywords or contact support.
            </p>
          </div>
        ) : (
          filteredFaqs.map((category, catIdx) => (
            <DocSection key={catIdx} title={category.category}>
              <div className="space-y-3 mt-6">
                {category.questions.map((item, qIdx) => {
                  const itemId = `${catIdx}-${qIdx}`;
                  return (
                    <FaqAccordionItem
                      key={itemId}
                      question={item.q}
                      answer={item.a}
                      isOpen={openItems.has(itemId) || !!searchQuery.trim()} // Auto-expand if searching
                      onClick={() => toggleItem(itemId)}
                    />
                  );
                })}
              </div>
            </DocSection>
          ))
        )}
      </div>

      {/* --- Minimal Support Escalation --- */}
      <div className="mt-16 border-t border-border/40 pt-8 pb-12">
        <div className="bg-card border border-border/60 rounded-xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              Still have questions?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our engineering support team is available to assist with complex
              integrations and architecture queries.
            </p>
          </div>
          <a
            href="mailto:support@senzor.dev"
            className="shrink-0 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors border border-border w-full sm:w-auto"
          >
            <Mail className="h-4 w-4" /> Contact Support
          </a>
        </div>
      </div>
    </DocsLayout>
  );
}
