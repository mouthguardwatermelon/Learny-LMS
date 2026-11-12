import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { tuitionRequest } from "@/services/courses";
import { Course } from "@/types";

export default function TuitionPayments({ course }: { course: Course }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  });
  const [payments, setPayments] = useState<{ month: string; ids: number[] }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const paymentsPath = course.id + "/payments/" + month;

  useEffect(() => {
    if (!month) return;
    let active = true;
    tuitionRequest<{ studentId: number }[]>("GET", paymentsPath)
      .then((rows) => {
        if (active) setPayments({ month, ids: rows.map((row) => row.studentId) });
      })
      .catch(() => { if (active) setError("Could not load payments."); });
    return () => { active = false; };
  }, [month, paymentsPath]);

  async function markPaid(id: number, paid: boolean) {
    setBusy(true);
    setError("");
    try {
      await tuitionRequest("PUT", paymentsPath + "/" + id, { paid });
      setPayments((current) => current?.month === month
        ? { month, ids: paid ? [...current.ids, id] : current.ids.filter((value) => value !== id) }
        : current);
    } catch {
      setError("Could not update the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-12 space-y-10">
      {error && <Alert severity="error">{error}</Alert>}
      <section>
        <h2 className="mb-4 text-3xl font-semibold dark:text-white">Tuition payments</h2>
        <TextField type="month" label="Month" value={month} disabled={busy}
          InputLabelProps={{ shrink: true }} onChange={(event) => setMonth(event.target.value)} />
        {payments?.month === month && (
          <div className="mt-3 flex flex-col dark:text-white">
            {course.students?.map((student) => (
              <FormControlLabel key={student.id} label={student.name + " paid"}
                control={<Checkbox disabled={busy} checked={payments.ids.includes(student.id)}
                  onChange={(event) => markPaid(student.id, event.target.checked)} />} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
