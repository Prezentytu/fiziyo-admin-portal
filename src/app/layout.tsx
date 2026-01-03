import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ApolloWrapper } from "@/lib/apollo/provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiziYo Admin",
  description: "Panel administracyjny dla fizjoterapeutów",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pl">
        <body className="antialiased">
          <ApolloWrapper>{children}</ApolloWrapper>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
