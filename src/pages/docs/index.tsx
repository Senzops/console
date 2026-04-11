import React from "react";
import Head from "next/head";
import { DocsLayout } from "../../components/DocsLayout";
import { DocHeader, DocSection } from "../../components/DocsUI";
import { DOCS_DATA } from "../../static/docsData";
import { Layers } from "lucide-react";

export default function DocsIntroduction() {
  const { introduction } = DOCS_DATA;

  return (
    <DocsLayout>

      <DocHeader
        title={introduction.title}
        description={introduction.description}
      />

      <DocSection title="Core Architecture Concepts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {introduction.coreConcepts.map((concept, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/60 rounded-xl p-6 shadow-sm hover:border-border transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {concept.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {concept.description}
              </p>
            </div>
          ))}
        </div>
      </DocSection>
    </DocsLayout>
  );
}
