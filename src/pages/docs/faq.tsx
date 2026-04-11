import React from "react";
import Head from "next/head";
import { DocsLayout } from "../../components/DocsLayout";
import { DocHeader, DocSection } from "../../components/DocsUI";
import { DOCS_DATA } from "../../static/docsData";

export default function DocsFaq() {
  return (
    <DocsLayout>

      <DocHeader
        title="Frequently Asked Questions"
        description="Answers to common questions regarding security, billing, and platform architecture."
      />

      <div className="space-y-12">
        {DOCS_DATA.faqs.map((category, idx) => (
          <DocSection key={idx} title={category.category}>
            <div className="space-y-6">
              {category.questions.map((item, qIdx) => (
                <div
                  key={qIdx}
                  className="bg-card border border-border/40 rounded-xl p-6"
                >
                  <h3 className="text-base font-bold text-foreground mb-3">
                    {item.q}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </DocSection>
        ))}
      </div>
    </DocsLayout>
  );
}
