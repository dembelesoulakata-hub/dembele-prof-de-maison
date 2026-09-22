import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ImagePlus, SendHorizonal, Square, X } from "lucide-react";
import { validateImage } from "@/lib/api";
import { Button } from "../ui";
import { QuickActions } from "./QuickActions";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string, file: File | null) => void;
  onStop: () => void;
  sending: boolean;
  disabled?: boolean;
  focusSignal?: number;
}

export function Composer({ value, onChange, onSend, onStop, sending, disabled, focusSignal }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    areaRef.current?.focus();
  }, [focusSignal]);

  // La zone de texte grandit avec le contenu (jusqu'à une limite)
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const canSend = !disabled && !sending && (value.trim().length > 0 || file !== null);

  function submit() {
    if (!canSend) return;
    onSend(value.trim() || "Voici mon exercice, aide-moi.", file);
    setFile(null);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border bg-card px-3 pb-3 pt-2">
      <div className="mx-auto max-w-3xl">
        <QuickActions
          disabled={disabled || sending}
          onPick={(t) => {
            onChange(t);
            areaRef.current?.focus();
          }}
        />
        {preview && (
          <div className="mb-2 flex items-center gap-2">
            <img src={preview} alt="Aperçu de l'image jointe" className="h-16 w-16 rounded-lg object-cover" />
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} aria-label="Retirer l'image">
              <X className="h-4 w-4" /> Retirer
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (!f) return;
              const err = validateImage(f);
              if (err) toast.error(err);
              else setFile(f);
            }}
          />
          <Button variant="outline" size="icon" disabled={disabled || sending} onClick={() => fileRef.current?.click()} aria-label="Joindre une image">
            <ImagePlus className="h-5 w-5" />
          </Button>
          <textarea
            ref={areaRef}
            rows={1}
            value={value}
            maxLength={4000}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKey}
            placeholder={disabled ? "Hors-ligne : lecture seule" : "Pose ta question ou colle ton exercice…"}
            aria-label="Ton message"
            className="max-h-44 min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 placeholder:text-muted-fg disabled:opacity-60"
          />
          {sending ? (
            <Button variant="outline" size="icon" onClick={onStop} aria-label="Arrêter la réponse">
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="icon" disabled={!canSend} onClick={submit} aria-label="Envoyer">
              <SendHorizonal className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
