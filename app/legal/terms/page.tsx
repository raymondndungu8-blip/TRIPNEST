import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata = {
  title: "Terms of Service — TripNest",
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

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="10 August 2026">
      <Section header="1. About TripNest">
        <p>
          TripNest is a ride-booking and event-transport marketplace that
          connects riders (&ldquo;Clients&rdquo;) with independent professional
          drivers (&ldquo;Drivers&rdquo;) for scheduled rides, airport pickups,
          event travel, and shared rides across Kenya. These Terms govern your
          use of the TripNest website, mobile web app, and related services
          (together, the &ldquo;Service&rdquo;).
        </p>
        <p>
          By registering or using the Service you agree to these Terms. If you
          do not agree, do not use the Service.
        </p>
      </Section>

      <Section header="2. The parties">
        <p>
          TripNest is a technology platform. It does not own, operate, or
          control any vehicle. Drivers are independent providers who offer
          transportation through the Service; TripNest is not a transportation
          carrier and neither party is an employee, agent, partner, or joint
          venturer of TripNest.
        </p>
      </Section>

      <Section header="3. Accounts">
        <p>
          You must provide accurate information when creating an account and
          keep your credentials secure. You are responsible for all activity
          under your account. Clients must be at least 18 years old. Drivers
          must hold a valid Kenyan driving licence, appropriate PSV or ride-hail
          permits, and insurance covering the rides they accept.
        </p>
      </Section>

      <Section header="4. Bookings & rides">
        <p>
          When you book, a confirmed fare is quoted before the trip begins.
          TripNest will attempt to match you with an available driver. Once a
          driver accepts, an agreement is formed between you and that driver
          for the quoted ride under these Terms.
        </p>
        <p>
          Trips may be cancelled before pickup per our{" "}
          <a href="/legal/cancellations" className="text-accent underline">
            cancellation policy
          </a>
          . Arrival times and ETAs are estimates and are not guaranteed.
        </p>
      </Section>

      <Section header="5. Payments">
        <p>
          Fares are paid by the Client to the driver through TripNest&rsquo;s
          payment partners (including M-Pesa). Before payment is processed you
          will see the amount due. TripNest may charge reasonable fees for some
          services; any such fees will be disclosed before you confirm.
        </p>
        <p>
          Do not pay a driver directly outside the Service. We are not
          responsible for any payment made outside our payment flow.
        </p>
      </Section>

      <Section header="6. Ratings & conduct">
        <p>
          Ratings and reviews reflect the experience of individual users. You
          agree to rate fairly and not to post abusive, harassing, or false
          content. Both Clients and Drivers must treat each other with respect
          and comply with all applicable laws.
        </p>
      </Section>

      <Section header="7. Acceptable use">
        <p>
          You agree not to misuse the Service, interfere with other users, book
          fraudulent or non-existent trips, or attempt to gain unauthorised
          access to any system or data. We may suspend or terminate accounts
          that breach these terms.
        </p>
      </Section>

      <Section header="8. Disclaimer of warranties">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available.&rdquo; To the maximum extent permitted by law, TripNest
          makes no warranties regarding the availability, reliability, or
          suitability of the Service or of any driver or vehicle.
        </p>
      </Section>

      <Section header="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, TripNest shall not be liable
          for indirect, incidental, special, or consequential damages, or for
          any loss arising out of the provision of transportation by a driver.
          Nothing in these Terms limits liability that cannot be limited under
          Kenyan law.
        </p>
      </Section>

      <Section header="10. Changes & contact">
        <p>
          We may update these Terms from time to time and will post the updated
          version here. Continued use of the Service after changes means you
          accept the updated Terms. Questions? Email{" "}
          <span className="text-foreground">support@tripnest.app</span>.
        </p>
      </Section>
    </LegalLayout>
  );
}