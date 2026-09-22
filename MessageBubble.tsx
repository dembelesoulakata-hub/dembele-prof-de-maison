import { memo, useEffect, useState } from "react";
import { signedImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Markdown } from "../Markdown";

function ExerciseImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedImageUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="mb-2 h-24 w-40 animate-pulse rounded-lg bg-primary-fg/20" aria-hidden />;
  return <img src={url} alt="Exercice joint" loading="lazy" className="mb-2 max-h-64 rounded-lg" />;
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  imagePath,
  streaming = false,
  failed = false,
}: {
  role: "user" | "assistant";
  content: string;
  imagePath?: string | null;
  streaming?: boolean;
  failed?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("msg-in flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[80%]",
          isUser ? "rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md border border-border bg-card",
          failed && "border-2 border-destructive",
        )}
      >
        {imagePath && <ExerciseImage path={imagePath} />}
        {isUser ? <p className="whitespace-pre-wrap break-words">{content}</p> : <Markdown content={content} streaming={streaming} />}
      </div>
    </div>
  );
});
