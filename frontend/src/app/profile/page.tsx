"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import NavigationBar from "@/components/NavigationBar";
import LoadingPage from "@/components/LoadingPage";
import { useAppDispatch, useAuth } from "@/hooks";
import { setUser } from "@/reducers/userReducer";
import { AccountProfile, getProfile, updateProfileSettings } from "@/services/courses";

export default function ProfilePage() {
  const [loading, user] = useAuth();
  const [profile, setProfile] = useState<AccountProfile>();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let active = true;
    getProfile().then((data) => { if (active) setProfile(data); })
      .catch(() => { if (active) setMessage("Could not load your profile."); });
    return () => { active = false; };
  }, [loading, user, router]);

  if (loading || !user) return <LoadingPage />;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const newPassword = String(fields.get("newPassword"));
    setSaving(true);
    setMessage("");
    try {
      setProfile(await updateProfileSettings({
        email: String(fields.get("email")),
        currentPassword: String(fields.get("currentPassword")),
        newPassword: newPassword || undefined,
      }));
      form.reset();
      if (newPassword) {
        window.localStorage.removeItem("AKAppSessionID");
        dispatch(setUser(null));
        router.replace("/login");
      } else {
        setMessage("Account settings saved.");
      }
    } catch (error) {
      const detail = error instanceof AxiosError ? error.response?.data : undefined;
      setMessage(typeof detail === "string" ? detail : "Could not save your settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <NavigationBar />
      <main className="mx-auto max-w-xl space-y-6 px-6 py-10">
        <h1 className="text-3xl font-semibold">Profile</h1>
        {profile && (
          <>
            <dl className="space-y-2">
              <div><dt>Name</dt><dd>{profile.name}</dd></div>
              <div><dt>Username</dt><dd>{profile.username}</dd></div>
              <div><dt>Role</dt><dd className="capitalize">{profile.role}</dd></div>
            </dl>
            <h2 className="text-2xl font-semibold">Account settings</h2>
            <form key={profile.email} onSubmit={save} className="space-y-4">
              <label className="block">Email
                <input className="block w-full rounded border bg-bg p-2" name="email" type="email"
                  autoComplete="email" defaultValue={profile.email} required />
              </label>
              <label className="block">Current password
                <input className="block w-full rounded border bg-bg p-2" name="currentPassword" type="password"
                  autoComplete="current-password" required />
              </label>
              <label className="block">New password (optional)
                <input className="block w-full rounded border bg-bg p-2" name="newPassword" type="password"
                  minLength={8} autoComplete="new-password" />
              </label>
              <button type="submit" className="rounded bg-pink px-4 py-2" disabled={saving}>Save settings</button>
            </form>
          </>
        )}
        {message && <p role="status">{message}</p>}
      </main>
    </div>
  );
}
