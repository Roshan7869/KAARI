import { Metadata } from "next";
import LoginClient from "./LoginClient";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Login | Kaari - Handmade Crochet Marketplace",
  description: "Log in to your Kaari account to view orders and manage your profile",
  openGraph: {
    type: "website",
    url: `${APP_URL}/login`,
    title: "Login | Kaari",
    description: "Log in to your account",
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
