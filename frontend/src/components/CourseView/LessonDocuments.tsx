import { useEffect, useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { MarkdownEditor } from "@/components/Markdown";
import { CourseDocument, lessonDocumentRequest } from "@/services/courses";
import { Course } from "@/types";

const emptyDocument = { title: "", body: "" };

export default function LessonDocuments({ course }: { course: Course }) {
  const [docs, setDocs] = useState<CourseDocument[]>();
  const [draft, setDraft] = useState<CourseDocument>(emptyDocument);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const documentsPath = course.id + "/documents";

  useEffect(() => {
    let active = true;
    lessonDocumentRequest<CourseDocument[]>("GET", documentsPath)
      .then((rows) => { if (active) setDocs(rows); })
      .catch(() => { if (active) setError("Could not load lesson documents."); });
    return () => { active = false; };
  }, [documentsPath]);

  async function saveDocument() {
    setBusy(true);
    setError("");
    try {
      const saved = await lessonDocumentRequest<CourseDocument>("POST", documentsPath, draft);
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
      await lessonDocumentRequest("DELETE", documentsPath + "/" + id);
      setDocs((rows) => rows?.filter((row) => row.id !== id));
      setDraft(emptyDocument);
    } catch {
      setError("Could not delete the document.");
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
    </div>
  );
}
