import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  alternates: { canonical: "/terms-and-conditions" },
  title: "Terms and Conditions — Blue Nest Montessori School",
  description:
    "The terms and conditions that form part of the agreement with Blue Nest Montessori School upon registration — covering registration, fees, cancellation and termination.",
  openGraph: {
    title: "Terms and Conditions — Blue Nest Montessori School",
    description:
      "The terms and conditions that form part of the agreement with Blue Nest Montessori School upon registration.",
    url: "/terms-and-conditions",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      kicker="Policies"
      title="Terms and Conditions"
      intro="Terms and conditions form part of the agreement with Blue Nest Montessori School upon registration. These terms and conditions relate to the contract between the nursery and the parent/guardian."
      lastReviewed="15 August 2026"
    >
      <p>
        The headings in this Agreement are inserted only for convenience and shall not affect its
        construction.
      </p>

      <h2>1. Registration</h2>
      <p>
        A registration fee as referred to on the fee sheet shall be paid by the parent/guardian to the
        nursery on submission of the completed application form and that fee shall not be returnable if
        such acceptance is later withdrawn by the parent/guardian.
      </p>

      <h2>2. Acceptance</h2>
      <p>
        A deposit as is referred to on the fee sheet shall be paid by the parent/guardian to the nursery
        on acceptance of the offer and that the deposit shall not be returnable unless one month&rsquo;s
        notice in writing is provided to the Nursery Manager or the Deputy. The deposit is not deductible
        from the first month&rsquo;s fees.
      </p>

      <h2>3. Payment of Nursery Fees</h2>
      <ol className="list-[lower-roman]">
        <li>
          Payment of fee to the nursery for the child&rsquo;s attendance at the nursery shall be made by
          the parent/guardian monthly in advance on the first day of each month (the due date),
          preferably by Standing Order.
        </li>
        <li>
          If payment of fees referred to in i) above shall be outstanding for more than 28 days then the
          nursery will by serving 7 days&rsquo; notice in writing, terminate this contract.
        </li>
        <li>
          The nursery reserves the right to increase the said fees at any time upon giving 28 days
          written notice of the proposed increase to the parent/guardian. If no representations are
          received in writing from the parent/guardian to the increased fees then the parent/guardian
          will be deemed to have accepted the same and the payment shall be due in accordance with
          clause i) hereof.
        </li>
        <li>
          If requests for additional sessions have been made or a late fee applied, the nursery will
          charge the same, monthly in arrears.
        </li>
        <li>Extra sessions will be charged for unless cancelled within 5 working days&rsquo; notice.</li>
      </ol>

      <h2>4. Calculation of Fee</h2>
      <ol className="list-[lower-roman]">
        <li>
          The nursery year runs from 1st September to 31st August. The nursery closes for one week at
          Christmas, all Bank Holidays and for two Inset Days (Staff Training).
        </li>
        <li>
          The fees payable by the parent/guardian are calculated by taking the child&rsquo;s weekly
          attendance fee, multiplying the same by 52 and dividing by 12 to give equal monthly payments
          which is required in accordance with clause 3 i). The nursery does not permit the payment of
          fees on a daily or weekly basis.
        </li>
        <li>
          The nursery does not permit the pro-rata deduction of payment of fees owing to the child being
          absent from the nursery due to illness or holiday whilst the nursery is open. The
          parent/guardian is therefore obliged to make full payment. In the event of payment not being
          made then the nursery reserves its rights to terminate this agreement in accordance with
          clause 3 ii).
        </li>
        <li>
          If the nursery closes due to events or circumstances outside of our control we shall be under
          no obligation to provide alternative childcare facilities to you. Parent/guardian will still
          be charged days the nursery is closed (i.e., weather conditions, health and safety reasons).
        </li>
      </ol>

      <h2>5. Cancellation / Termination</h2>
      <ol className="list-[lower-roman]">
        <li>
          After the nursery has made an offer but before acceptance by the parent/guardian either party
          may cancel the offer by serving 7 days written notice.
        </li>
        <li>
          After acceptance of the offer by the parent/guardian either party may terminate this agreement
          by service of one calendar month&rsquo;s notice in writing. During that said one-month period
          the nursery undertakes to pay all fees due. In the event of the parent/guardian failing to pay
          the one-month&rsquo;s fees the child&rsquo;s place shall be immediately withdrawn and the
          nursery shall be entitled to serve a formal demand for payment of such monies.
        </li>
        <li>
          In the event of the parent/guardian giving notice of withdrawal of the child and immediately
          withdrawing the said child there shall be due to the nursery one month&rsquo;s fees in lieu to
          the nursery for one month&rsquo;s fees.
        </li>
        <li>Notice must be in writing and posted to the Nursery Manager.</li>
        <li>Termination of this agreement may also be effected in accordance with clause 3 iii).</li>
        <li>
          Where one deposit is taken for siblings, it will be held until the last contract is
          terminated.
        </li>
      </ol>

      <h2>6. Insurance of Children</h2>
      <p>
        No responsibility is accepted for any child who arrives at the nursery before 7:30am nor for the
        money or articles of value lost on the nursery premises or elsewhere whilst the child is under
        the nursery&rsquo;s control.
      </p>

      <h2>7. Acceptance</h2>
      <p>
        The above terms and conditions are considered to be fair and reasonable. In the event of any
        term found by a Court of Law to be unreasonable then that clause shall be removed but the
        agreement shall remain in full force and effect.
      </p>
      <p>
        The parent/guardian has read and understands the Terms and Conditions contained herein and
        undertakes to be bound by the same.
      </p>
      <p>
        Blue Nest Montessori School reserves the right to amend or change the Terms and Conditions at
        any time and without prior notice.
      </p>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:manager@bluenest.uk">manager@bluenest.uk</a>
      </p>
    </LegalPageShell>
  );
}
