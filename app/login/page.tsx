import { Metadata } from "next";
import Login from "@/components/pages/Login";

export const metadata: Metadata = {
  title: "Login | Kaari - Handmade Crochet Marketplace",
  description: "Log in to your Kaari account to view orders and manage your profile",
  openGraph: {
    type: "website",
    url: "https://kaari.in/login",
    title: "Login | Kaari",
    description: "Log in to your account",
  },
};

export default function LoginPage() {
  return <Login />;
}
