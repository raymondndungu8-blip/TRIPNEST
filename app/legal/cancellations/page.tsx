import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata = {
  title: "Cancellation & Refund Policy — TripNest",
};

function Section({
  header,
  children,
}: {
  header: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
        {header}
      </h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function CancellationsPage() {
  return (
    <LegalLayout title="Cancellation & Refund Policy" updated="10 August 2026">
      <Section header="1. Better the driver you know">
        <p>
          TripNest is a planned-transport marketplace: rides are scheduled in
          advance, often for events and airport pickups. Because a driver
          reserves time for your trip, we apply a fair cancellation policy.
        </p>
      </Section>

      <Section header="2. Before the driver accepts">
        <p>
          You may cancel any ride free of charge before a driver accepts your
          request. Tap <strong>Cancel Trip</strong> on the active ride card —
          no fee applies.
        </p>
      </Section>

      <Section header="3. After the driver accepts (before pickup)">
        <p>
          Free cancellation applies within the first 5 minutes of the driver
          accepting. After that, cancel fees are:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Client-initiated: KES 50 or 10% of the fare, whichever is higher</li>
          <li>Driver-initiated (driver cannot make the trip): no charge to you</li>
          <li>No-show (client not at pickup at the agreed time): full fare may be charged</li>
        </ul>
      </Section>

      <Section header="4. During the trip">
        <p>
          Once a trip is in progress (the ride has started), it cannot be
          cancelled by the Client for a refund. If a safety issue arises, use
          the <strong>Emergency / SOS</strong> button in your app or call the
          emergency line. Reasonable partial credit may be issued at our
          discretion where the trip could not be completed through no fault of
          the Client.
        </p>
      </Section>

      <Section header="5. Refunds">
        <p>
          If you are entitled to a refund, it is returned the same way you paid
          — for M-Pesa, back to the same phone number, typically within 3
          business days. Refunds are shown as a TripNest credit or reversal
          depending on the original payment method.
        </p>
      </Section>

      <Section header="6. Exceptions">
        <p>
          Weather, public safety, and force-majeure cancellations are handled
          case by case and we will generally refund affected Clients without
          penalty.
        </p>
      </Section>

      <Section header="7. Disputes">
        <p>
          If you believe a fee was charged unfairly, email{" "}
          <span className="text-foreground">support@tripnest.app</span> within
          7 days with your trip receipt and we will review it.
        </p>
      </Section>
    </LegalLayout>
  );
}