import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of Use — Blue Nest Montessori School",
  description:
    "The terms that apply to your use of the Blue Nest Montessori website, including disclaimers for admissions information, fees, intellectual property, acceptable use, external links and limitations of liability.",
  openGraph: {
    title: "Terms of Use — Blue Nest Montessori School",
    description:
      "Website terms of use for Blue Nest Montessori School — admissions, fees, acceptable use and liability.",
    url: "/terms",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      kicker="Policies"
      title="Terms of Use"
      intro="These terms govern your use of bluenest.uk, including the parent-facing pages, the chatbot assistant, the nursery store and any forms or downloads we make available. By using the website you agree to be bound by them."
    >
      <p>
        Blue Nest Montessori School operates this website to provide information about our nurseries, our Montessori
        and forest-school approach, our admissions process and our nursery store. These Terms of Use sit alongside
        our <a href="/privacy">Privacy &amp; Cookie Policy</a> and, where you place an order from the Blue Nest
        Nursery Store, our <a href="/trading-terms">Trading Terms</a>. If you do not agree to any of these terms,
        please stop using the website.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Blue Nest Montessori School (&ldquo;Blue Nest&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) is a group of
        Ofsted-registered Montessori day nurseries operating in Harrow, Pinner, Borehamwood,
        Pinner Green, Northwood and Aldershot. Our registered office and head office are located in Harrow. You can reach us at
        {" "}<a href="mailto:manager@bluenest.uk">manager@bluenest.uk</a> or by telephone via the contact page.
      </p>

      <h2>2. Use of this website</h2>
      <ul>
        <li>The site is provided for personal, non-commercial information about our nurseries and store</li>
        <li>You must be 18 or over to create an account, submit an enquiry or place an order</li>
        <li>You must keep your account credentials confidential and let us know promptly if you suspect unauthorised access</li>
        <li>We may suspend, withdraw, or change any part of the site at any time without notice</li>
      </ul>

      <h2>3. Admissions information disclaimer</h2>
      <p>
        Information published on the website about our nurseries — including session times, age groups, group sizes,
        room availability and waiting lists — is provided for general guidance only. Availability is dynamic and
        depends on current enrolment, staffing ratios and statutory limits. Anything binding will be confirmed
        directly with you in writing as part of the formal admissions process. The website does not in itself form
        an offer of a nursery place or any priority on a waiting list.
      </p>

      <h2>4. Fees and pricing disclaimer</h2>
      <p>
        Fee guidance, calculators, examples and downloadable schedules are shown for indicative purposes. Actual
        fees depend on the branch, sessions booked, age group, applicable funded entitlement and any optional
        services. Fees are reviewed periodically and the version of fees that applies to your child is the one set
        out in the contract you sign at registration. Quoted prices for nursery-store products are governed by our
        {" "}<a href="/trading-terms">Trading Terms</a>.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        All content on the website — text, imagery, illustrations, photographs of our children and settings, logos,
        videos, software and code — belongs to Blue Nest Montessori School or our licensors. You may:
      </p>
      <ul>
        <li>View and print pages for your own personal, non-commercial use</li>
        <li>Share links to public pages on social media or by email</li>
      </ul>
      <p>You may not:</p>
      <ul>
        <li>Copy, reproduce, republish, redistribute, frame or scrape any part of the site without our written consent</li>
        <li>Reuse photography of our children, staff or settings for any commercial or competitive purpose</li>
        <li>Reverse engineer or extract data from the chatbot, the nursery store or any other interactive feature</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>You must not use the website in any way that:</p>
      <ul>
        <li>Breaks the law or any applicable UK regulation</li>
        <li>Introduces viruses, malware, denial-of-service traffic or other harmful code</li>
        <li>Attempts to gain unauthorised access to admin areas, parent accounts or the underlying systems</li>
        <li>Sends spam, automated enquiries, abusive messages or content that is harmful to children</li>
        <li>Misrepresents your identity, your relationship to a child or your reason for contacting us</li>
      </ul>

      <h2>7. External links</h2>
      <p>
        Our website may link to third-party sites — local authorities, education resources, partner organisations
        and our payment provider. We provide these links for your convenience and have no control over their
        content, privacy practices or availability. We are not responsible for any loss or harm arising from your
        use of an external site.
      </p>

      <h2>8. Submissions and user-generated content</h2>
      <p>
        If you submit information through an enquiry form, the chatbot, the application form or any feedback
        mechanism, you confirm that the content you submit is your own, accurate and lawful. We may use enquiry
        content to respond to you, improve our service and meet our regulatory obligations.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        We work hard to keep the website accurate and available, but we make no warranty that it will always be
        available, error-free or up to date. To the fullest extent permitted by law:
      </p>
      <ul>
        <li>We exclude all implied terms, conditions and warranties relating to the website</li>
        <li>We are not liable for indirect or consequential loss, loss of business, loss of profits or loss of data arising from your use of the website</li>
        <li>Nothing in these terms limits our liability for death or personal injury caused by negligence, for fraud, or for any other liability that cannot be lawfully excluded</li>
      </ul>

      <h2>10. Changes to these terms</h2>
      <p>
        We may revise these terms from time to time. The version in force is the one shown on this page. Material
        changes will be communicated to registered parents via email. Continued use of the website after a change
        constitutes acceptance of the revised terms.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of England and Wales. Any dispute arising from your use of the website
        will be subject to the exclusive jurisdiction of the courts of England and Wales.
      </p>
    </LegalPageShell>
  );
}
