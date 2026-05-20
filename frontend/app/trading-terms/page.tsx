import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  alternates: { canonical: "/trading-terms" },
  title: "Trading Terms — Blue Nest Nursery Store",
  description:
    "Trading terms for the Blue Nest Nursery Store — orders, prices, payment via Stripe, delivery, damaged or faulty items, cancellations, returns and refunds. UK consumer rights apply.",
  openGraph: {
    title: "Trading Terms — Blue Nest Nursery Store",
    description:
      "Trading terms for the Blue Nest Nursery Store — orders, payment, delivery, returns and refunds.",
    url: "/trading-terms",
    type: "website",
  },
};

export default function TradingTermsPage() {
  return (
    <LegalPageShell
      kicker="Policies"
      title="Trading Terms"
      intro="These trading terms apply when you buy a product from the Blue Nest Nursery Store. They set out how orders are placed, how prices and payment work, our delivery commitments and your rights to cancel, return or refund a purchase."
      lastReviewed="19 May 2026"
    >
      <p>
        The Blue Nest Nursery Store is operated by Blue Nest Montessori School. These trading terms apply to every
        order you place through the store at bluenest.uk/nursery-store. They sit alongside our
        {" "}<a href="/terms">Terms of Use</a> and our <a href="/privacy">Privacy &amp; Cookie Policy</a>. Nothing
        in these terms affects your statutory rights as a consumer under UK law, including the Consumer Rights
        Act 2015 and the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013.
      </p>

      <h2>1. About the store</h2>
      <p>
        The nursery store sells Montessori-inspired learning materials, sensory resources, home-learning kits and
        Blue Nest merchandise. Products are curated by our educators and may have limited stock. Photographs are
        for illustration; small variations in colour, grain or finish are normal for natural-material toys.
      </p>

      <h2>2. Placing an order</h2>
      <ul>
        <li>You must be 18 or over to place an order</li>
        <li>An order is an offer to buy; it becomes a contract only once we send you an order-confirmation email</li>
        <li>We may decline an order if stock is unavailable, if there is an error in the listed price, or if we suspect fraudulent or abusive activity</li>
        <li>If we decline an order after taking payment we will refund the payment in full to the original method</li>
      </ul>

      <h2>3. Prices and payment</h2>
      <ul>
        <li>Prices are shown in pounds sterling (GBP) and include VAT where applicable</li>
        <li>Delivery is calculated and confirmed at checkout</li>
        <li>Payment is taken at the point of order via <strong>Stripe</strong>, our payment-services provider</li>
        <li>We accept the credit and debit cards supported by Stripe, including Apple Pay and Google Pay where available</li>
        <li>Stripe handles your card details directly under their own terms and privacy policy; we never see or store your full card number</li>
        <li>If a payment is declined we will hold your basket for a short time and let you know so you can retry</li>
      </ul>

      <h2>4. Delivery</h2>
      <ul>
        <li>Standard delivery to UK addresses takes 3&ndash;5 working days from order confirmation</li>
        <li>Larger or made-to-order items may take longer; the product page or order confirmation will indicate this</li>
        <li>Risk in the goods passes to you once they have been delivered to the address you provided</li>
        <li>If you choose collection from one of our nurseries, please bring your order confirmation</li>
        <li>We currently deliver only within the United Kingdom</li>
      </ul>

      <h2>5. Damaged, faulty or missing items</h2>
      <p>
        We pack every order carefully, but if something arrives damaged or with a manufacturing fault, please get in
        touch within 14 days of delivery so we can put it right. Photographs of the damage and the outer packaging
        help us resolve things quickly. Depending on the issue we will offer a free replacement, a repair or a full
        refund. Under the Consumer Rights Act 2015 you may also be entitled to a price reduction or to reject the
        item if a fault appears within the first 30 days.
      </p>

      <h2>6. Cancellations and returns</h2>
      <ul>
        <li>You have <strong>14 calendar days</strong> from the day you receive the goods to tell us you wish to cancel, under the Consumer Contracts Regulations 2013</li>
        <li>You then have a further 14 days to return the goods to us</li>
        <li>Returned items must be unused, complete and in their original packaging</li>
        <li>Refunds are issued via the original payment method within 14 days of us receiving the goods (or evidence that you have sent them)</li>
        <li>You pay the cost of return postage unless the item was faulty, damaged or sent in error</li>
      </ul>
      <p>
        The cancellation right does not apply to a small number of items — for example, sealed hygiene products
        once opened, perishables, or made-to-order or personalised items. Where this applies it is flagged clearly
        on the product page.
      </p>

      <h2>7. Refunds</h2>
      <p>
        We process approved refunds back to the original payment method via Stripe. Once the refund is approved on
        our side it usually appears in your account within 5&ndash;10 working days, depending on your bank or card
        issuer. For payments made by Apple Pay or Google Pay, the refund returns to the underlying funding source.
      </p>

      <h2>8. Pricing or stock errors</h2>
      <p>
        We try hard to keep the store accurate, but if a product is listed with an obvious pricing error or shows
        as available when it is not, we may correct the listing and cancel any affected orders. If we have already
        charged you we will refund the full amount and explain what happened.
      </p>

      <h2>9. Liability</h2>
      <ul>
        <li>We are responsible for foreseeable losses caused by our failure to comply with these trading terms or by our negligence</li>
        <li>We are not responsible for any loss that was not foreseeable, or for losses arising from how a product is used outside its intended purpose</li>
        <li>Our total liability for any order is limited to the price you paid for that order, except where the law does not allow us to do so — for example for death or personal injury caused by our negligence</li>
      </ul>

      <h2>10. Complaints and support</h2>
      <p>
        If something has gone wrong with an order, please email
        {" "}<a href="mailto:manager@bluenest.uk">manager@bluenest.uk</a> with your order number and a short
        description of the issue. We aim to acknowledge complaints within two working days and resolve them within
        14 days. If you are not satisfied with our response, you are entitled to escalate the matter to the
        Citizens Advice consumer service or to your card issuer&rsquo;s chargeback scheme.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these trading terms to reflect changes in the law, our payment provider or our store
        operations. The terms that apply to your order are the ones published on this page at the time the order
        was confirmed.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These trading terms are governed by the laws of England and Wales. Any dispute relating to a purchase from
        the Blue Nest Nursery Store will be subject to the exclusive jurisdiction of the courts of England and
        Wales.
      </p>
    </LegalPageShell>
  );
}
