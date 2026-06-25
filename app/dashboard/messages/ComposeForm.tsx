"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  ErrorBanner,
  inputClass,
  labelClass,
  buttonClass,
} from "@/components/ui";
import type { AudienceKind } from "@/lib/audience";
import { previewAudience, sendMessage } from "./actions";

export interface TeamOption {
  id: string;
  name: string;
  age_group: string;
}
export interface GuardianOption {
  id: string;
  name: string;
  family: string;
}

type Phase = "compose" | "confirm" | "done";

export function ComposeForm({
  teams,
  ageGroups,
  guardians,
  seasonName,
  canBroadcast,
  defaultKind = "team",
  defaultTeamId = "",
}: {
  teams: TeamOption[];
  ageGroups: string[];
  guardians: GuardianOption[];
  seasonName: string | null;
  canBroadcast: boolean;
  defaultKind?: AudienceKind;
  defaultTeamId?: string;
}) {
  const [kind, setKind] = useState<AudienceKind>(canBroadcast ? defaultKind : "team");
  const [teamId, setTeamId] = useState(defaultTeamId);
  const [ageGroup, setAgeGroup] = useState(ageGroups[0] ?? "");
  const [guardianIds, setGuardianIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [phase, setPhase] = useState<Phase>("compose");
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("audience_kind", kind);
    fd.set("subject", subject);
    fd.set("body", body);
    if (kind === "team") fd.set("team_id", teamId);
    if (kind === "age_group") fd.set("age_group", ageGroup);
    if (kind === "custom") guardianIds.forEach((id) => fd.append("guardian_ids", id));
    return fd;
  }

  function review() {
    setError(null);
    if (!subject.trim()) return setError("A subject is required.");
    if (!body.trim()) return setError("A message body is required.");
    if (kind === "team" && !teamId) return setError("Pick a team.");
    if (kind === "custom" && guardianIds.length === 0)
      return setError("Pick at least one person.");
    startTransition(async () => {
      const res = await previewAudience(null, buildFormData());
      if ("error" in res) return setError(res.error);
      setPreview(res);
      setPhase("confirm");
    });
  }

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendMessage(null, buildFormData());
      if ("error" in res) return setError(res.error);
      setResult({ sent: res.sent, failed: res.failed });
      setPhase("done");
    });
  }

  const audienceLabel = (() => {
    switch (kind) {
      case "team":
        return teams.find((t) => t.id === teamId)?.name ?? "a team";
      case "age_group":
        return `${ageGroup} (${seasonName ?? "season"})`;
      case "season":
        return `everyone in ${seasonName ?? "this season"}`;
      case "club":
        return "the whole club";
      case "custom":
        return `${guardianIds.length} selected ${
          guardianIds.length === 1 ? "person" : "people"
        }`;
    }
  })();

  if (phase === "done" && result) {
    return (
      <Card>
        <h2 className="font-semibold text-nova-deep">Message sent</h2>
        <p className="mt-2 text-sm text-gray-600">
          Delivered to <strong>{result.sent}</strong>{" "}
          {result.sent === 1 ? "guardian" : "guardians"}
          {result.failed > 0 && (
            <>
              {" "}
              · <span className="text-red-600">{result.failed} failed</span>
            </>
          )}
          .
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard/messages" className={buttonClass("primary")}>
            View sent history
          </Link>
          <button
            onClick={() => {
              setResult(null);
              setSubject("");
              setBody("");
              setPreview(null);
              setPhase("compose");
            }}
            className={buttonClass("secondary")}
          >
            Send another
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && <ErrorBanner message={error} />}

      <Card>
        <label className={labelClass}>Audience</label>
        {canBroadcast ? (
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AudienceKind)}
            disabled={phase === "confirm"}
            className={inputClass}
          >
            <option value="team">A specific team</option>
            <option value="age_group">An age group (this season)</option>
            <option value="season">Everyone in this season</option>
            <option value="club">The whole club</option>
            <option value="custom">Specific people</option>
          </select>
        ) : (
          <p className="text-sm text-gray-600">
            You can message a team you coach.
          </p>
        )}

        <div className="mt-3">
          {kind === "team" && (
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={phase === "confirm"}
              className={inputClass}
            >
              <option value="">Select a team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {kind === "age_group" && (
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              disabled={phase === "confirm"}
              className={inputClass}
            >
              {ageGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
          {kind === "custom" && (
            <select
              multiple
              value={guardianIds}
              onChange={(e) =>
                setGuardianIds(
                  Array.from(e.target.selectedOptions).map((o) => o.value)
                )
              }
              disabled={phase === "confirm"}
              className={`${inputClass} h-40`}
            >
              {guardians.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.family}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      <Card>
        <label className={labelClass}>Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={phase === "confirm"}
          className={`${inputClass} mb-4`}
          placeholder="Practice moved to 6pm Thursday"
        />
        <label className={labelClass}>Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={phase === "confirm"}
          rows={8}
          className={inputClass}
          placeholder="Write in a warm, clear, concise club voice…"
        />
        <p className="mt-2 text-xs text-gray-400">
          Club voice: warm, clear, and concise. Emails go to guardians only and
          are sent from the club&apos;s aznova.org address.
        </p>
      </Card>

      {phase === "compose" && (
        <button onClick={review} disabled={pending} className={buttonClass("primary")}>
          {pending ? "Checking recipients…" : "Review recipients"}
        </button>
      )}

      {phase === "confirm" && preview && (
        <Card className="border-nova-violet">
          <h2 className="font-semibold text-nova-deep">Confirm send</h2>
          <p className="mt-2 text-sm text-gray-700">
            This will email <strong>{preview.count}</strong>{" "}
            {preview.count === 1 ? "guardian" : "guardians"} for{" "}
            <strong>{audienceLabel}</strong>.
          </p>
          {preview.sample.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              e.g. {preview.sample.join(", ")}
              {preview.count > preview.sample.length ? ", …" : ""}
            </p>
          )}
          {(kind === "club" || kind === "season") && (
            <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This is a broad, club-wide style send. Double-check the audience
              and message before confirming.
            </p>
          )}
          {preview.count === 0 ? (
            <p className="mt-3 text-sm text-red-600">
              No guardians resolved for this audience — nothing to send.
            </p>
          ) : (
            <div className="mt-4 flex gap-3">
              <button onClick={send} disabled={pending} className={buttonClass("primary")}>
                {pending ? "Sending…" : `Send to ${preview.count}`}
              </button>
              <button
                onClick={() => setPhase("compose")}
                disabled={pending}
                className={buttonClass("secondary")}
              >
                Back to edit
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
