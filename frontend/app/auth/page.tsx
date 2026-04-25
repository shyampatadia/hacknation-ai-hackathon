import { AuthCard } from "@/components/AuthCard";

export default function AuthPage() {
  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <span className="eyebrow">Operator auth</span>
        <h1>Access roles, saved work, and protected workflows without mixing identity into the data layer.</h1>
        <p>
          Supabase owns user identity. The FastAPI backend validates the token and writes the profile layer
          through the service role key.
        </p>
      </div>
      <AuthCard />
    </section>
  );
}
