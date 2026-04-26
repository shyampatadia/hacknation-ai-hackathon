"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { bootstrapUserProfile, fetchCurrentProfile, fetchCurrentUser } from "@/lib/auth-api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const roleOptions = [
  { value: "public_user", label: "Public user" },
  { value: "asha_worker", label: "ASHA worker" },
  { value: "ngo_planner", label: "NGO planner" },
  { value: "government_auditor", label: "Government auditor" },
  { value: "admin", label: "Admin" },
];

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [district, setDistrict] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [language, setLanguage] = useState("en");
  const [role, setRole] = useState("ngo_planner");
  const [status, setStatus] = useState("Use magic link sign-in for planners, auditors, and field workers.");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profileSummary, setProfileSummary] = useState<string>("No profile loaded yet.");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    void hydrateProfile(session.access_token);
  }, [session?.access_token]);

  async function hydrateProfile(accessToken: string) {
    try {
      const [userResponse, profileResponse] = await Promise.all([
        fetchCurrentUser(accessToken),
        fetchCurrentProfile(accessToken),
      ]);

      const profile = profileResponse.profile;
      setProfileSummary(
        profile
          ? `${profile.role} profile loaded for ${profile.email}.`
          : `Authenticated as ${userResponse.user.email}. No operator profile exists yet.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load backend auth state.";
      setProfileSummary(message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/auth`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setStatus(error.message);
      } else {
        setStatus("Magic link sent. Complete sign-in from your inbox.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Supabase client is not configured.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBootstrapProfile() {
    if (!session?.access_token) {
      setStatus("Sign in first, then bootstrap the operator profile.");
      return;
    }

    setLoading(true);

    try {
      const response = await bootstrapUserProfile(session.access_token, {
        role,
        full_name: fullName || undefined,
        organization: organization || undefined,
        district: district || undefined,
        state: stateRegion || undefined,
        language,
      });

      setStatus(`Profile stored for ${response.profile.email}.`);
      setProfileSummary(`${response.profile.role} profile is active and ready for role-based views.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save user profile.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <span className="eyebrow">Application profile</span>
      <h3>Sign in and bootstrap operator access</h3>
      <p>Supabase handles identity. FastAPI validates tokens and writes profile state through the service role key.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="auth-input"
          type="email"
          placeholder="planner@ngo.org"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>
      <div className="status">{session?.user?.email ? `Authenticated as ${session.user.email}` : "No active session yet."}</div>
      <div className="auth-form">
        <input
          className="auth-input"
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <select className="filter-select" value={role} onChange={(event) => setRole(event.target.value)}>
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          className="auth-input"
          type="text"
          placeholder="Organization"
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
        />
        <input
          className="auth-input"
          type="text"
          placeholder="District"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />
        <input
          className="auth-input"
          type="text"
          placeholder="State"
          value={stateRegion}
          onChange={(event) => setStateRegion(event.target.value)}
        />
        <input
          className="auth-input"
          type="text"
          placeholder="Language code"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        />
        <button className="secondary-button" type="button" onClick={handleBootstrapProfile} disabled={loading}>
          {loading ? "Working..." : "Bootstrap profile"}
        </button>
      </div>
      <div className="status">{status}</div>
      <div className="status">{profileSummary}</div>
    </section>
  );
}
