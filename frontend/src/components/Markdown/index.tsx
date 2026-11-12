import { useState } from "react";
import { Button, TextField } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ value }: { value: string }) {
  return (
    <div className="break-words dark:text-text [&_a]:underline [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6 [&_pre]:overflow-auto [&_p]:mb-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img"]}>
        {value}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="my-4">
      <Button onClick={() => setPreview(!preview)} aria-pressed={preview}>
        {preview ? "Edit Markdown" : "Preview Markdown"}
      </Button>
      {preview ? (
        <Markdown value={value.trim() ? value : "Nothing to preview."} />
      ) : (
        <TextField
          label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          helperText="Supports Markdown formatting."
          multiline
          fullWidth
          minRows={4}
          maxRows={8}
        />
      )}
    </div>
  );
}
