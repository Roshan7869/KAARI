import { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Sign Up | Kaari - Handmade Crochet Marketplace",
  description: "Create a Kaari account to start shopping for handmade crochet products",
  openGraph: {
    type: "website",
    url: `${APP_URL}/signup`,
    title: "Sign Up | Kaari",
    description: "Create your account",
  },
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4">
      <SignUp
        routing="hash"
        signInUrl="/login"
        fallbackRedirectUrl="/"
      />
    </main>
  );
}
