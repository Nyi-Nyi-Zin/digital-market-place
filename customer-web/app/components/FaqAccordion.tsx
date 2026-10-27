"use client";

import { Accordion } from "radix-ui";
import { ChevronDown } from "lucide-react";

export function FaqAccordion({
  sections,
}: {
  sections: { heading: string; body: string }[];
}) {
  return (
    <Accordion.Root type="multiple" className="faq-accordion">
      {sections.map((section, index) => (
        <Accordion.Item className="faq-item" value={String(index)} key={index}>
          <Accordion.Header className="faq-heading">
            <Accordion.Trigger className="faq-trigger">
              <span>{section.heading}</span>
              <ChevronDown size={20} aria-hidden="true" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="faq-content">
            <p>{section.body}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
