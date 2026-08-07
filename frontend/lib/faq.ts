// Shared FAQ content + JSON-LD helper for Generative Engine Optimization (GEO).
// FAQPage structured data is one of the most-cited formats by AI assistants and
// Google AI Overviews, so we surface accurate, self-contained Q&A on the key
// pages. All answers are drawn from existing site facts (see chatbot-knowledge.ts
// and the page copy) — keep them factual and in sync with the LocalBusiness schema.

export type Faq = { question: string; answer: string };

/** Build a schema.org FAQPage object from a list of Q&A pairs. */
export function faqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

// General, site-wide FAQs (homepage + contact). Facts mirror the LocalBusiness
// JSON-LD in app/layout.tsx and the nursery details in lib/chatbot-knowledge.ts.
export const generalFaqs: Faq[] = [
  {
    question: "What ages does Blue Nest Montessori accept?",
    answer:
      "Blue Nest Montessori cares for children from 3 months to 5 years across our Harrow, Pinner and Borehamwood nurseries, with new settings coming soon to Pinner Green and Northwood.",
  },
  {
    question: "Where are the Blue Nest Montessori nurseries?",
    answer:
      "Our main nursery is at 29 Churchfield Close, Harrow HA2 6BD, with further settings in Pinner and Borehamwood and new branches opening in Pinner Green and Northwood. We serve families across Harrow, Pinner, Borehamwood and the surrounding areas.",
  },
  {
    question: "What are your opening hours?",
    answer:
      "Blue Nest Montessori is open Monday to Friday, 7:30am to 6:00pm, year-round. Morning, afternoon and full-day sessions are available, with a minimum of two days per week recommended for settling.",
  },
  {
    question: "Do you offer government-funded childcare?",
    answer:
      "Yes. We accept all government childcare entitlements: 15 and 30 funded hours for eligible 3- and 4-year-olds, 15 funded hours for eligible 2-year-olds, and funded hours from 9 months for eligible working parents.",
  },
  {
    question: "Is Blue Nest Montessori Ofsted registered?",
    answer:
      "Yes. Blue Nest Montessori is Ofsted-registered and rated Good, and was named Montessori School of the Year (London Prestige Awards). We blend the authentic Montessori approach with the EYFS framework and weekly Forest School.",
  },
  {
    question: "How do I arrange a visit or apply for a place?",
    answer:
      "Call 020 8861 5574 or email manager@bluenest.uk to book a show-around, or complete the application form on our website. Our settling-in programme is gentle and personalised, with a key person for every child.",
  },
];

// Per-branch FAQs. Addresses are only asserted where confirmed in the branch
// JSON-LD; for settings without a finalised street address we point families to
// contact us, rather than stating an address we can't verify.
export const branchFaqs: Record<string, Faq[]> = {
  aldershot: [
    {
      question: "Is there a Montessori nursery in Aldershot?",
      answer:
        "Yes. Blue Nest Montessori School on Belle Vue Road is Aldershot's first dedicated Montessori day nursery, taking children from 3 months to 5 years.",
    },
    {
      question: "Do you offer 15 and 30 hours funded childcare in Aldershot?",
      answer:
        "Yes. We accept government-funded hours for eligible children from 9 months, term-time or stretched across the year. Our team can check your eligibility and help you apply.",
    },
    {
      question: "What ages does the Aldershot nursery take?",
      answer: "From 3 months to 5 years, across dedicated baby, toddler and preschool rooms.",
    },
    {
      question: "What are the opening hours of the Aldershot nursery?",
      answer: "Monday to Friday, 7:30am to 6:00pm. The earliest drop-off in town, minutes from Aldershot station.",
    },
    {
      question: "How much does nursery cost in Aldershot?",
      answer:
        "Use our online fee calculator for an instant estimate. Fees vary by age, sessions and funding, and sibling discounts are available.",
    },
    {
      question: "Do you provide halal food?",
      answer:
        "Yes. Halal options are part of our standard menu, prepared in our 5-star hygiene rated kitchen, with vegetarian and allergy-aware choices too.",
    },
    {
      question: "How do I book a visit to the Aldershot nursery?",
      answer: "Use the Book a Visit button or call 01252 343772, and we'd love to show you around.",
    },
  ],
  harrow: [
    {
      question: "Where is the Blue Nest Montessori nursery in Harrow?",
      answer:
        "Our Harrow nursery is at 29 Churchfield Close, Harrow HA2 6BD, near South Harrow (Piccadilly line), serving Harrow, South Harrow, Rayners Lane and North Harrow.",
    },
    {
      question: "What are the opening hours of the Harrow nursery?",
      answer: "The Harrow nursery is open Monday to Friday, 7:30am to 6:00pm, year-round.",
    },
    {
      question: "What ages and funding does the Harrow nursery offer?",
      answer:
        "Harrow accepts children from 3 months to 5 years and welcomes all government childcare funding, including 15 and 30 hours for 3- and 4-year-olds and funded hours from 9 months for eligible working parents.",
    },
  ],
  borehamwood: [
    {
      question: "Where is the Blue Nest Montessori nursery in Borehamwood?",
      answer:
        "Our Borehamwood setting serves families across Borehamwood, Elstree, Radlett and the surrounding Hertfordshire area. Call 020 8953 1718 or email manager@bluenest.uk for the address and to book a visit.",
    },
    {
      question: "What are the opening hours of the Borehamwood nursery?",
      answer: "The Borehamwood nursery is open Monday to Friday, 7:30am to 6:00pm, year-round.",
    },
    {
      question: "What ages and funding does the Borehamwood nursery offer?",
      answer:
        "Borehamwood accepts children from 3 months to 5 years and welcomes all government childcare funding, including 15 and 30 funded hours and funded hours from 9 months for eligible working parents.",
    },
  ],
  pinner: [
    {
      question: "Where is the Blue Nest Montessori nursery in Pinner?",
      answer:
        "Our Pinner setting serves Pinner, Pinner Green, Hatch End, Eastcote and Northwood. Call 07400 430630 or email manager@bluenest.uk for the address and to arrange a show-around.",
    },
    {
      question: "What are the opening hours of the Pinner nursery?",
      answer: "The Pinner nursery is open Monday to Friday, 7:30am to 6:00pm, year-round.",
    },
    {
      question: "What ages and funding does the Pinner nursery offer?",
      answer:
        "Pinner accepts children from 3 months to 5 years and welcomes all government childcare funding, including 15 and 30 funded hours and funded hours from 9 months for eligible working parents.",
    },
  ],
};
