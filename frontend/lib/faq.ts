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
      "Blue Nest Montessori cares for children from 3 months to 5 years across our Harrow, Pinner, Borehamwood and Aldershot nurseries, with new settings coming soon to Pinner Green and Northwood.",
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
      question: "How close is Blue Nest to Alderwood Infant School?",
      answer:
        "We are on Belle Vue Road in GU12 4RZ, the same road and the same postcode as the Alderwood infant site. For families with an older child already at the school, the nursery run and the school run are the same short walk.",
    },
    {
      question: "What age can my child start?",
      answer:
        "From 3 months. We have a full baby room, a toddler room and a preschool room, and children stay with us until they leave for Reception at four or five.",
    },
    {
      question: "Will Blue Nest prepare my child for Alderwood or another Aldershot primary?",
      answer:
        "Yes. Our preschool year focuses on the practical independence, early phonics, early number work and concentration that Reception teachers look for. We are an independent nursery with no formal link to any school, so you remain completely free in your school choice.",
    },
    {
      question: "Do you take children who are still in nappies?",
      answer:
        "Yes, at any age. Nappy changing, toilet training and all intimate care are part of what we do, which is where we differ from the school-based breakfast, after-school and holiday clubs in Aldershot, most of which start at four and require children to be fully potty trained.",
    },
    {
      question: "Are you open in the school holidays?",
      answer:
        "Yes. We offer all-year contracts covering 52 weeks, as well as term-time-only contracts across 38 weeks if you prefer. There is no summer gap to cover.",
    },
    {
      question: "Do you accept funded childcare?",
      answer:
        "We accept 15 and 30 funded hours for eligible families, and Tax-Free Childcare. Use the fee calculator on this page for an indicative figure, then ask us for a personalised quote.",
    },
    {
      question: "What are your opening hours?",
      answer: "Monday to Friday, 7:30am to 6:00pm, with early drop-off available from 7:30am.",
    },
    {
      question: "Do you support forces families?",
      answer:
        "Yes. Aldershot is a garrison town and we are used to children joining and leaving mid-year. Our key-person approach and flexible contracts are built to settle a child quickly.",
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
