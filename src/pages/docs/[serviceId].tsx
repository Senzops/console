import { GetStaticProps, GetStaticPaths } from "next";
import { DocsLayout } from "../../components/DocsLayout";
import {
  DocHeader,
  DocSection,
  CodeTabs,
  StepList,
  Callout,
} from "../../components/DocsUI";
import { DOCS_DATA, DocServiceConfig } from "../../static/docsData";
import { CheckCircle2 } from "lucide-react";

interface ServiceDocProps {
  service: DocServiceConfig;
}

export default function ServiceDocPage({ service }: ServiceDocProps) {
  // Fallback in case of routing mismatch
  if (!service) return null;

  return (
    <DocsLayout>

      <DocHeader title={service.title} description={service.overview} />

      <DocSection title="Prerequisites">
        <ul className="space-y-3 mt-4">
          {service.prerequisites.map((req, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="leading-relaxed">{req}</span>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="1. Dashboard Configuration">
        <p className="text-sm text-muted-foreground mb-6">
          Before injecting code into your application, you must provision an API
          key from the Senzor dashboard.
        </p>
        <StepList steps={service.registrationSteps} />
      </DocSection>

      {service.installation && service.installation.length > 0 && (
        <DocSection title="2. SDK Installation">
          <p className="text-sm text-muted-foreground mb-4">
            Select your environment below to view the initialization code.
          </p>
          <CodeTabs snippets={service.installation} />
        </DocSection>
      )}

      {service.troubleshooting && service.troubleshooting.length > 0 && (
        <DocSection title="Troubleshooting & Edge Cases">
          {service.troubleshooting.map((caseItem, idx) => (
            <Callout key={idx} type="warning" title={caseItem.issue}>
              <p>{caseItem.solution}</p>
            </Callout>
          ))}
        </DocSection>
      )}
    </DocsLayout>
  );
}

// Next.js Static Generation: Generate all valid routes from our JSON Config
export const getStaticPaths: GetStaticPaths = async () => {
  const paths = DOCS_DATA.services.map((service) => ({
    params: { serviceId: service.id },
  }));

  return { paths, fallback: false }; // Returns 404 for unknown services
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const serviceId = params?.serviceId as string;
  const service = DOCS_DATA.services.find((s) => s.id === serviceId);

  return {
    props: {
      service: service || null,
    },
  };
};
