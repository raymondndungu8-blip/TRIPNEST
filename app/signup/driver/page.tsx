"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Logo } from "@/components/brand/logo";
import { FadeIn } from "@/components/motion/motion";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { PhoneOtp } from "@/components/auth/phone-otp";
import { DriverSetupForm } from "@/components/driver/driver-setup-form";

export default function DriverSignupPage() {
  const router = useRouter();
  const { user, driver, setDriver, loading, setRolePreference } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    setRolePreference("driver");
  }, [setRolePreference]);

  useEffect(() => {
    if (!loading && driver) router.replace("/driver");
  }, [loading, driver, router]);

  if (loading) return <DashboardSkeleton />;

  return (
    <AppShell withNav={false}>
      <FadeIn>
        <div className="mb-6 flex justify-center">
          <Logo size={32} />
        </div>

        <PageHeader
          title={user ? "Set up your driver profile" : "Sign in as a driver"}
          subtitle={
            user
              ? "Add your photo, vehicle and documents to start driving."
              : "Verify your phone with a one-time code to start driving."
          }
          back
        />

        {!user ? (
          <PhoneOtp onVerified={() => undefined} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
              <ShieldCheck className="h-4 w-4" />
              {user.phoneNumber ?? "Phone"} verified
            </div>

            <DriverSetupForm
              user={user}
              phone={user.phoneNumber ?? ""}
              submitLabel="Create driver account"
              onCreated={(d) => {
                setDriver(d);
                toast("Welcome to TripNest!", "success");
                router.push("/driver");
              }}
            />
          </div>
        )}
      </FadeIn>
    </AppShell>
  );
}