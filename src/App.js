import { useState, useMemo } from "react";

export default function UrgentCareCapacityApp() {
  const TRIAGE = [
    { level: 1, label: "Triage 1", consult: 60, cap: Infinity },
    { level: 2, label: "Triage 2", consult: 45, cap: 6 },
    { level: 3, label: "Triage 3", consult: 30, cap: 15 },
    { level: 4, label: "Triage 4", consult: 20, cap: 25 },
    { level: 5, label: "Triage 5", consult: 15, cap: 30 }
  ];

  const [patients, setPatients] = useState([0, 0, 0, 0, 0]);
  const [clinicians, setClinicians] = useState(2);
  const [closingHour, setClosingHour] = useState(22); // 10pm default

  const now = new Date();
  const minutesUntilClose = Math.max(
    0,
    (closingHour - now.getHours()) * 60 - now.getMinutes()
  );

  const remainingCapacity = minutesUntilClose * clinicians;

  const workloads = TRIAGE.map((t, i) => patients[i] * t.consult);

  const cumulativeWorkloads = workloads.map((_, i) =>
    workloads.slice(0, i + 1).reduce((a, b) => a + b, 0)
  );

  const acceptingStatus = TRIAGE.map((t, i) => {
    if (patients[i] >= t.cap) return "STOP";
    if (cumulativeWorkloads[i] > remainingCapacity) return "STOP";
    return "ACCEPT";
  });

  const lowestAcceptableTriage = acceptingStatus.findIndex(s => s === "STOP");

  const banner = useMemo(() => {
    if (lowestAcceptableTriage === -1)
      return { text: "Accepting all triage levels", color: "bg-green-600" };
    if (lowestAcceptableTriage === 0)
      return { text: "CRITICAL ONLY – Triage 1", color: "bg-red-700" };
    return {
      text: `Accepting Triage 1–${lowestAcceptableTriage} only`,
      color: "bg-orange-600"
    };
  }, [lowestAcceptableTriage]);

  const estimateWait = (i) => {
    const higher = workloads.slice(0, i).reduce((a, b) => a + b, 0);
    const sameAhead = Math.max(patients[i] - 1, 0) * TRIAGE[i].consult;
    return clinicians > 0
      ? Math.round((higher + sameAhead) / clinicians)
      : Infinity;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Urgent Care Capacity Tool</h1>

      <div className={`text-white p-4 rounded-xl mb-6 text-lg font-semibold ${banner.color}`}>
        {banner.text}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block font-medium">Clinicians on duty</label>
          <input type="number" min="1" value={clinicians}
            onChange={e => setClinicians(Number(e.target.value))}
            className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block font-medium">Closing hour (24h)</label>
          <input type="number" min="0" max="23" value={closingHour}
            onChange={e => setClosingHour(Number(e.target.value))}
            className="border p-2 w-full rounded" />
        </div>
        <div className="flex items-end font-semibold">
          Remaining capacity: {remainingCapacity} min
        </div>
      </div>

      <table className="w-full border rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Triage</th>
            <th className="border p-2">Patients waiting</th>
            <th className="border p-2">Est. wait (min)</th>
            <th className="border p-2">Accepting</th>
          </tr>
        </thead>
        <tbody>
          {TRIAGE.map((t, i) => (
            <tr key={t.level}>
              <td className="border p-2 font-medium">{t.label}</td>
              <td className="border p-2">
                <input type="number" min="0" value={patients[i]}
                  onChange={e => {
                    const copy = [...patients];
                    copy[i] = Number(e.target.value);
                    setPatients(copy);
                  }}
                  className="border p-1 w-20 rounded" />
              </td>
              <td className="border p-2">{estimateWait(i)}</td>
              <td className={`border p-2 font-semibold ${acceptingStatus[i] === "STOP" ? "text-red-600" : "text-green-600"}`}>
                {acceptingStatus[i]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 text-sm text-gray-600">
        Priority-based queueing in effect. Lower triage may be paused indefinitely when higher acuity is present. Wait times are estimates only.
      </div>

      <GovernancePanel banner={banner} acceptingStatus={acceptingStatus} />
    </div>
  );
}

function GovernancePanel({ banner, acceptingStatus }) {
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [log, setLog] = useState([]);

  const handleOverride = () => {
    if (!reason.trim()) return alert("Override reason required");
    const entry = {
      time: new Date().toLocaleString(),
      decision: banner.text,
      reason
    };
    setLog([entry, ...log]);
    setOverride(false);
    setReason("");
  };

  return (
    <div className="mt-8 p-4 border rounded-xl bg-gray-50">
      <h2 className="text-lg font-bold mb-2">Governance & Overrides</h2>

      <div className="mb-3">
        <button
          onClick={() => setOverride(!override)}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Manual Override
        </button>
      </div>

      {override && (
        <div className="mb-4">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Enter clinical/operational justification"
            className="w-full border p-2 rounded"
          />
          <button
            onClick={handleOverride}
            className="mt-2 px-4 py-2 bg-gray-800 text-white rounded"
          >
            Confirm Override
          </button>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-1">Override Log</h3>
        {log.length === 0 && <div className="text-sm text-gray-500">No overrides recorded</div>}
        {log.map((l, i) => (
          <div key={i} className="text-sm border-t py-1">
            <strong>{l.time}</strong> — {l.decision}<br />
            Reason: {l.reason}
          </div>
        ))}
      </div>
    </div>
  );
}
