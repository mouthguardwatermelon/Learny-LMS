import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { MarkdownEditor } from "@/components/Markdown";
import { CourseDocument, teacherTool } from "@/services/courses";
import { Course } from "@/types";

const emptyDocument = { title: "", body: "" };

export default function TeacherTools({ course }: { course: Course }) {
  const [docs, setDocs] = useState<CourseDocument[]>();
  const [draft, setDraft] = useState<CourseDocument>(emptyDocument);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  });
  const [payments, setPayments] = useState<{ month: string; ids: number[] }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const documentsPath = course.id + "/documents";
  const paymentsPath = course.id + "/payments/" + month;

  useEffect(() => {
    let active = true;
    teacherTool<CourseDocument[]>("GET", documentsPath)
      .then((rows) => { if (active) setDocs(rows); })
      .catch(() => { if (active) setError("Could not load lesson documents."); });
    return () => { active = false; };
  }, [documentsPath]);

  useEffect(() => {
    if (!month) return;
    let active = true;
    teacherTool<{ studentId: number }[]>("GET", paymentsPath)
      .then((rows) => {
        if (active) setPayments({ month, ids: rows.map((row) => row.studentId) });
      })
      .catch(() => { if (active) setError("Could not load payments."); });
    return () => { active = false; };
  }, [month, paymentsPath]);

  async function saveDocument() {
    setBusy(true);
    setError("");
    try {
      const saved = await teacherTool<CourseDocument>("POST", documentsPath, draft);
      setDocs((rows) => [...(rows ?? []).filter((row) => row.id !== saved.id), saved]
        .sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
      setDraft(saved);
    } catch {
      setError("Could not save the document.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDocument(id: number) {
    if (!window.confirm("Delete this lesson document?")) return;
    setBusy(true);
    setError("");
    try {
      await teacherTool("DELETE", documentsPath + "/" + id);
      setDocs((rows) => rows?.filter((row) => row.id !== id));
      setDraft(emptyDocument);
    } catch {
      setError("Could not delete the document.");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(id: number, paid: boolean) {
    setBusy(true);
    setError("");
    try {
      await teacherTool("PUT", paymentsPath + "/" + id, { paid });
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
        <h2 className="mb-4 text-3xl font-semibold dark:text-white">Lesson documents</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button disabled={busy || !docs} onClick={() => setDraft(emptyDocument)}>New document</Button>
          {docs?.map((doc) => (
            <Button key={doc.id} disabled={busy} onClick={() => setDraft(doc)}>{doc.title}</Button>
          ))}
        </div>
        {docs && (
          <>
            <TextField label="Document title" fullWidth disabled={busy} value={draft.title}
              inputProps={{ maxLength: 200 }}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <MarkdownEditor label="Lesson plan" value={draft.body}
              onChange={(body) => setDraft({ ...draft, body })} />
            <Button disabled={busy || !draft.title.trim() || draft.body.length > 50000}
              onClick={saveDocument}>Save document</Button>
            {draft.id !== undefined && (
              <Button color="error" disabled={busy} onClick={() => deleteDocument(draft.id!)}>Delete document</Button>
            )}
          </>
        )}
      </section>
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
