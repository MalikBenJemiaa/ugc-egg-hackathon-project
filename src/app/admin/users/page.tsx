"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";

type UserItem = { id: string; email: string; role: string; status: string; createdAt: string };

export default function AdminUsers() {
  const token = useMemo(() => getToken(), []);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.ok) setUsers(json.users);
    else setMsg(json?.message ?? "Failed to load users.");
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setStatus = async (userId: string, status: "active" | "suspended") => {
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      setMsg(json?.message ?? "Update failed.");
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Directory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Users</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Suspend suspicious buyers or reactivate creators after manual review.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-stone-800 underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          ← Admin home
        </Link>
      </div>

      {msg ? (
        <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">{msg}</div>
      ) : null}

      <div className="mt-8 space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight text-stone-900">{u.email}</div>
                <div className="mt-1 text-xs text-stone-500">
                  Role <span className="font-medium text-stone-800">{u.role}</span> · Status{" "}
                  <span className="font-medium capitalize text-stone-800">{u.status}</span>
                  <span className="text-stone-400"> · </span>
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus(u.id, "active")}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(u.id, "suspended")}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                >
                  Suspend
                </button>
              </div>
            </div>
          </div>
        ))}
        {!users.length ? <p className="text-sm text-stone-600">No users found.</p> : null}
      </div>
    </div>
  );
}

