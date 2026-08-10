import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata = {
  title: "Privacy Policy — TripNest",
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

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="10 August 2026">
      <Section header="1. Who we are">
        <p>
          This policy explains how TripNest (&ldquo;we&rdquo;) collects, uses,
          and protects your personal data when you use our ride-booking and
          event-transport marketplace in Kenya.
        </p>
      </Section>

      <Section header="2. What we collect">
        <p>We collect the information you give us when you register and use the Service, including:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Name, email address, and phone number</li>
          <li>Driver details — vehicle type, registration plate, and operating locations</li>
          <li>Payment information processed by our payment partners (e.g. M-Pesa); card numbers are never stored by us</li>
          <li>Ride details such as pickup, destination, time, and fare</li>
          <li>Device location while drivers are online and during active trips</li>
          <li>Messages you exchange with drivers or riders</li>
          <li>Ratings and safety reports</li>
        </ul>
      </Section>

      <Section header="3. How we use it">
        <p>
          We use your data to provide and improve the Service: matching and
          completing rides, processing payments, sending booking confirmations
          and notifications, protecting the safety of our community, providing
          customer support, and complying with the law.
        </p>
      </Section>

      <Section header="4. Location">
        <p>
          When a driver is online, the driver&rsquo;s approximate location is
          shared with nearby Clients so they can book. During an active trip,
          the driver&rsquo;s live location is shown to the Client for tracking.
          You can stop location sharing by going offline and closing the app.
        </p>
      </Section>

      <Section header="5. Sharing">
        <p>
          We share information only as needed to operate the Service: between
          Clients and the Drivers they ride with, with payment processors to
          complete payments, and with service providers who help us run the
          platform. We do not sell your personal data.
        </p>
        <p>
          We may share data where the law requires, or to protect the rights
          and safety of any person.
        </p>
      </Section>

      <Section header="6. Security">
        <p>
          We use industry-standard safeguards such as encrypted connections,
          role-based access, and activity logging to protect your data. No
          method of transmission is 100% secure, and we cannot guarantee
          absolute security.
        </p>
      </Section>

      <Section header="7. Retention">
        <p>
          We keep personal data for as long as your account is active or as
          needed to provide the Service and comply with legal, accounting, or
          safety requirements. You can have your account and data deleted by
          contacting support.
        </p>
      </Section>

      <Section header="8. Your rights">
        <p>
          You may access, correct, or delete your personal data, and you may
          withdraw consent to processing (such as notifications) at any time.
          To exercise these rights, email{" "}
          <span className="text-foreground">support@tripnest.app</span>.
        </p>
      </Section>

      <Section header="9. Contact">
        <p>
          Questions about this policy:{" "}
          <span className="text-foreground">privacy@tripnest.app</span>,
          TripNest Ltd, Nairobi, Kenya.
        </p>
      </Section>
    </LegalLayout>
  );
}