import { Metadata } from "next";
import Signup from "@/components/pages/Signup";

// Force dynamic rendering - this page uses client-side auth
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Sign Up | Kaari - Handmade Crochet Marketplace",
  description: "Create a Kaari account to start shopping for handmade crochet products",
  openGraph: {
    type: "website",
    url: "https://kaari.in/signup",
    title: "Sign Up | Kaari",
    description: "Create your account",
  },
};

export default function SignupPage() {
  return <Signup />;
}
