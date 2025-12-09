import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-surface border border-border",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "bg-surface-light hover:bg-surface-hover border-border",
            formFieldLabel: "text-foreground",
            formFieldInput: "bg-input border-border text-foreground",
            footerActionLink: "text-primary hover:text-primary-light",
            formButtonPrimary: "bg-primary hover:bg-primary-dark text-primary-foreground",
          },
        }}
      />
    </div>
  );
}
