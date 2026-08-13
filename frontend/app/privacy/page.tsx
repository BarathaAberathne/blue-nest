import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy & Cookie Policy — Blue Nest Montessori School",
  description:
    "How Blue Nest Montessori School collects, uses, stores and protects personal information about parents, children and website visitors. UK GDPR compliant.",
  openGraph: {
    title: "Privacy & Cookie Policy — Blue Nest Montessori School",
    description:
      "How Blue Nest Montessori collects, uses, stores and protects personal information — UK GDPR compliant.",
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      kicker="Policies"
      title="Privacy & Cookie Policy"
      intro="Blue Nest Montessori School is committed to protecting the privacy of our families, children, staff and website visitors. This policy explains what personal information we collect, why we collect it, how we use it, and the rights you have under UK GDPR."
    >
      <p>
        <strong>Blue Nest Montessori School</strong> (&ldquo;Blue Nest&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) is the
        data controller for the personal information described in this policy. We operate Montessori day nurseries
        across Harrow, Pinner, Borehamwood, Pinner Green, Northwood and Aldershot. This policy applies to all personal data we
        process — through our nurseries, our website at bluenest.uk and our supporting systems.
      </p>

      <h2>1. Personal data we collect</h2>
      <p>The categories of personal data we collect depend on your relationship with us.</p>

      <h3>Parents and guardians</h3>
      <ul>
        <li>Full name, postal address, email address and telephone numbers</li>
        <li>Relationship to the child and parental responsibility status</li>
        <li>Emergency contacts and authorised collection persons</li>
        <li>Employer details where required for funded-childcare administration</li>
        <li>Billing and payment information processed via our payment provider</li>
        <li>Any correspondence and enquiry history with our team</li>
      </ul>

      <h3>Children in our care</h3>
      <ul>
        <li>Full name, date of birth, photograph and home address</li>
        <li>Medical history, allergies, dietary requirements and care plans</li>
        <li>Developmental records, EYFS observations and learning journey entries</li>
        <li>Attendance, sessions booked and incident or accident records</li>
        <li>Safeguarding-related records as required by statutory guidance</li>
      </ul>

      <h3>Website visitors</h3>
      <ul>
        <li>Information submitted through enquiry forms, the chat assistant or the prospectus download form</li>
        <li>Order details if you purchase from the Blue Nest Nursery Store</li>
        <li>Technical data such as IP address, browser type, device type and pages visited</li>
        <li>Cookie identifiers (see &ldquo;Cookies&rdquo; below)</li>
      </ul>

      <h2>2. How we use personal information</h2>
      <ul>
        <li>To deliver early-years care, learning and safeguarding for the children enrolled with us</li>
        <li>To process admissions, registrations and ongoing communication with parents</li>
        <li>To process payments, fees, deposits and refunds</li>
        <li>To respond to enquiries submitted through this website or by phone or email</li>
        <li>To send service updates about your child&rsquo;s sessions, closures and policy changes</li>
        <li>To meet legal and regulatory obligations, including Ofsted and local authority reporting</li>
        <li>To improve our website, services and communications</li>
      </ul>

      <h2>3. Legal basis under UK GDPR</h2>
      <p>We rely on the following lawful bases, depending on the purpose:</p>
      <ul>
        <li><strong>Contract</strong> — to deliver the childcare services you have signed up for</li>
        <li><strong>Legal obligation</strong> — to meet statutory safeguarding, health-and-safety and tax requirements</li>
        <li><strong>Vital interests</strong> — to protect the welfare and safety of a child in an emergency</li>
        <li><strong>Legitimate interests</strong> — to run our website, respond to enquiries and improve our service</li>
        <li><strong>Consent</strong> — for non-essential cookies, marketing communications and photographs used in publicity, which you may withdraw at any time</li>
      </ul>

      <h2>4. Children&rsquo;s information and safeguarding</h2>
      <p>
        Information about children is treated with the highest level of care. Access to children&rsquo;s records is
        restricted to the staff who need it to deliver their role. We follow the statutory framework for the Early
        Years Foundation Stage, Keeping Children Safe in Education and our internal safeguarding policy. Where we are
        required to share information with social care, the police, the local authority designated officer or other
        statutory bodies, we will do so without parental consent if it is necessary to protect a child from harm.
      </p>

      <h2>5. Cookies and analytics</h2>
      <p>Our website uses a small number of cookies and similar technologies:</p>
      <ul>
        <li><strong>Strictly necessary cookies</strong> — keep you signed in to the parent or admin area and remember your shopping cart in the nursery store. These cannot be switched off.</li>
        <li><strong>Performance and analytics cookies</strong> — help us understand how the site is used so we can improve it. These are only set if you give consent.</li>
        <li><strong>Payment-provider cookies</strong> — set by Stripe when you reach a checkout page so they can detect fraud and process your payment securely.</li>
      </ul>
      <p>You can clear or block cookies in your browser at any time. Doing so may affect the functionality of signed-in areas or the checkout.</p>

      <h2>6. Sharing your information</h2>
      <p>We share personal data only where we have a clear basis to do so:</p>
      <ul>
        <li>With trusted service providers who help us run the nursery and the website — for example, our payment processor (Stripe), our hosting and email providers and our nursery management software</li>
        <li>With local authorities and HMRC, where we administer free entitlement, tax-free childcare or other funded places</li>
        <li>With Ofsted, the local authority designated officer or other statutory bodies where required by law</li>
        <li>With successors in title or new owners if Blue Nest is reorganised or transferred</li>
      </ul>
      <p>We never sell personal information.</p>

      <h2>7. Data retention</h2>
      <p>We keep personal data only for as long as we need it for the purpose it was collected, or to meet legal obligations:</p>
      <ul>
        <li>Children&rsquo;s records — typically retained until the child reaches the age of 25, in line with statutory safeguarding guidance</li>
        <li>Accident, incident and safeguarding records — retained in line with EYFS and safeguarding requirements</li>
        <li>Financial and tax records — at least seven years</li>
        <li>Website enquiry and chat-assistant records — up to 24 months unless a longer period is required to resolve a matter</li>
        <li>Marketing-consent records — until consent is withdrawn</li>
      </ul>

      <h2>8. Security</h2>
      <p>
        Personal data is held on secured systems with role-based access. Paper records are stored in locked
        cabinets at each nursery. All staff receive data-protection and safeguarding training as part of their
        induction and on an ongoing basis.
      </p>

      <h2>9. Your rights</h2>
      <p>Under UK GDPR you have the right to:</p>
      <ul>
        <li>Ask for a copy of the personal data we hold about you</li>
        <li>Ask us to correct information that is wrong or incomplete</li>
        <li>Ask us to delete information we no longer need, subject to any legal retention requirements</li>
        <li>Ask us to restrict or object to specific uses of your data</li>
        <li>Withdraw consent at any time where we rely on it</li>
        <li>Lodge a complaint with the Information Commissioner&rsquo;s Office (ico.org.uk)</li>
      </ul>

      <h2>10. Contact</h2>
      <p>
        For any privacy-related questions, or to exercise the rights above, please email
        {" "}<a href="mailto:manager@bluenest.uk">manager@bluenest.uk</a> or write to us at our Harrow head office.
        We aim to respond within 30 calendar days.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We review this policy regularly and will update it whenever our practices change. The &ldquo;last reviewed&rdquo;
        date at the top of the page always reflects the most recent version. Material changes will be communicated
        to parents directly.
      </p>
    </LegalPageShell>
  );
}
