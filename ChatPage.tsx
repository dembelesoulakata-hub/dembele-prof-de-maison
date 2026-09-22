import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Menu, RotateCw, WifiOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PAGE_SIZE, createChat, deleteChat, listChats, loadMessages, renameChat, uploadExercise } from "@/lib/api";
import { cacheGet, cacheRemove, cacheSet } from "@/lib/offlineCache";
import { ChatError, chatErrorMessage, streamChat } from "@/lib/stream";
import { friendlyError } from "@/lib/utils";
import type { Chat, Message } from "@/types/db";
import { Button, Spinner } from "@/components/ui";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageBubble } from "@/components/chat/MessageBubble";

interface Pending {
  text: string;
  imagePath: string | null;
}

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [chats, setChats] = useState<Chat[]>(() => cacheGet<Chat[]>("chats") ?? []);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [focusSignal, setFocusSignal] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const sending = streamText !== null;
  const active = chats.find((c) => c.id === chatId);

  // --- Réseau ---
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // --- Liste des chapitres (avec repli sur le cache hors-ligne) ---
  const refreshChats = useCallback(async () => {
    try {
      const c = await listChats();
      setChats(c);
      cacheSet("chats", c);
    } catch {
      /* on garde la liste en cache */
    } finally {
      setChatsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (!chatsLoaded) return;
    if (!chatId && chats[0]) navigate(`/app/chat/${chats[0].id}`, { replace: true });
    else if (chatId && online && !chats.some((c) => c.id === chatId)) navigate("/app/chat", { replace: true });
  }, [chatId, chatsLoaded, chats, online, navigate]);

  // --- Messages du chapitre actif (paginés) ---
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setHasMore(false);
    setStreamText(null);
    setPending(null);
    setFailure(null);
    if (!chatId) return;

    let alive = true;
    setLoadingMsgs(true);
    stickRef.current = true;
    loadMessages(chatId)
      .then((r) => {
        if (!alive) return;
        setMessages(r.messages);
        setHasMore(r.hasMore);
        cacheSet(`messages:${chatId}`, r.messages);
      })
      .catch(() => {
        if (!alive) return;
        const cached = cacheGet<Message[]>(`messages:${chatId}`);
        if (cached) {
          setMessages(cached);
          toast.info("Hors-ligne : voici tes derniers messages enregistrés.");
        } else toast.error("Impossible de charger ce chapitre. Vérifie ton réseau.");
      })
      .finally(() => alive && setLoadingMsgs(false));

    setDraft(cacheGet<string>(`draft:${chatId}`) ?? "");
    const prefill = (location.state as { prefill?: string } | null)?.prefill;
    if (prefill) {
      setDraft(prefill);
      setFocusSignal((s) => s + 1);
      navigate(location.pathname, { replace: true, state: null });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // --- Sauvegarde automatique du brouillon ---
  useEffect(() => {
    if (!chatId) return;
    const id = window.setTimeout(() => {
      if (draft) cacheSet(`draft:${chatId}`, draft);
      else cacheRemove(`draft:${chatId}`);
    }, 400);
    return () => window.clearTimeout(id);
  }, [draft, chatId]);

  // --- Défilement : on suit la conversation sauf si l'élève remonte lire ---
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, streamText, pending, failure]);

  async function loadOlder() {
    const first = messages[0];
    if (!chatId || !first) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      const r = await loadMessages(chatId, first.created_at);
      stickRef.current = false;
      setMessages((m) => [...r.messages, ...m]);
      setHasMore(r.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
      });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setLoadingOlder(false);
    }
  }

  // --- Envoi d'un message ---
  const send = useCallback(
    async (text: string, file: File | null, retryPath: string | null = null) => {
      if (!chatId || !user || sendingRef.current) return;
      sendingRef.current = true;
      setFailure(null);
      setStreamText("");
      stickRef.current = true;

      let imagePath = retryPath;
      setPending({ text, imagePath });
      const controller = new AbortController();
      abortRef.current = controller;
      let full = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        setStreamText(full);
      };

      try {
        if (file) {
          imagePath = await uploadExercise(file, user.id);
          setPending({ text, imagePath });
        }
        const id = await streamChat({
          chatId,
          message: text,
          imagePath,
          signal: controller.signal,
          onToken: (t) => {
            full += t;
            if (!raf) raf = requestAnimationFrame(flush); // affichage fluide, sans re-rendu à chaque token
          },
        });
        if (raf) cancelAnimationFrame(raf);
        const now = new Date().toISOString();
        const userMsg: Message = { id: `local-u-${crypto.randomUUID()}`, chat_id: chatId, role: "user", content: text, image_path: imagePath, created_at: now };
        const aiMsg: Message = { id: id ?? `local-a-${crypto.randomUUID()}`, chat_id: chatId, role: "assistant", content: full, image_path: null, created_at: now };
        setMessages((m) => {
          const next = [...m, userMsg, aiMsg];
          cacheSet(`messages:${chatId}`, next.slice(-PAGE_SIZE));
          return next;
        });
        setPending(null);
        setStreamText(null);
        cacheRemove(`draft:${chatId}`);
        void refreshChats(); // le titre du chapitre peut avoir été généré
      } catch (e) {
        if (raf) cancelAnimationFrame(raf);
        setStreamText(null);
        if (e instanceof ChatError && e.code === "aborted") {
          setPending(null);
          setDraft(text);
          toast.info("Réponse arrêtée.");
        } else if (e instanceof ChatError && e.code === "blocked") {
          setPending(null);
          toast.error(chatErrorMessage(e));
          navigate("/app", { replace: true }); // le portail de blocage se recalcule à la navigation
        } else {
          setFailure(e instanceof ChatError ? chatErrorMessage(e) : friendlyError(e));
        }
      } finally {
        sendingRef.current = false;
        abortRef.current = null;
      }
    },
    [chatId, user, refreshChats, navigate],
  );

  function retry() {
    if (pending) void send(pending.text, null, pending.imagePath);
  }

  function cancelFailed() {
    if (pending) setDraft(pending.text);
    setPending(null);
    setFailure(null);
  }

  // --- Gestion des chapitres ---
  async function newChat() {
    try {
      const c = await createChat();
      setChats((p) => [c, ...p]);
      setDrawer(false);
      navigate(`/app/chat/${c.id}`);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function rename(id: string, title: string) {
    const previous = chats;
    setChats((p) => p.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await renameChat(id, title);
    } catch (e) {
      setChats(previous);
      toast.error(friendlyError(e));
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer ce chapitre et tous ses messages ? Ce que ton prof a retenu de toi est conservé.")) return;
    try {
      await deleteChat(id);
      cacheRemove(`messages:${id}`);
      cacheRemove(`draft:${id}`);
      setChats((p) => p.filter((c) => c.id !== id));
      if (id === chatId) navigate("/app/chat", { replace: true });
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  const sidebar = (
    <ChatSidebar
      chats={chats}
      activeId={chatId}
      disabled={sending || !online}
      onSelect={(id) => {
        setDrawer(false);
        navigate(`/app/chat/${id}`);
      }}
      onNew={() => void newChat()}
      onRename={(id, t) => void rename(id, t)}
      onDelete={(id) => void remove(id)}
    />
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card md:block">{sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Tes chapitres">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-card shadow-xl">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" aria-label="Fermer la liste" onClick={() => setDrawer(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir la liste des chapitres" onClick={() => setDrawer(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-bold">{active ? `Chapitre ${active.chapter_number} : ${active.title}` : "Tes chapitres"}</h1>
        </div>

        {!online && (
          <div role="status" className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2 text-sm font-semibold">
            <WifiOff className="h-4 w-4" aria-hidden /> Hors-ligne : tu peux relire tes derniers chapitres, pas en écrire de nouveaux.
          </div>
        )}

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {!chatId && chatsLoaded && chats.length === 0 && (
              <div className="py-16 text-center">
                <h2 className="mb-2 text-2xl font-bold">Ton premier chapitre</h2>
                <p className="mb-6 text-muted-fg">Un chapitre, c'est une leçon ou un sujet. Ton prof se souvient de tous les autres.</p>
                <Button variant="accent" size="lg" disabled={!online} onClick={() => void newChat()}>
                  Créer un chapitre
                </Button>
              </div>
            )}

            {loadingMsgs && <Spinner />}

            {hasMore && !loadingMsgs && (
              <div className="text-center">
                <Button variant="outline" size="sm" loading={loadingOlder} onClick={() => void loadOlder()}>
                  Voir les messages précédents
                </Button>
              </div>
            )}

            {chatId && !loadingMsgs && messages.length === 0 && !pending && (
              <div className="py-12 text-center text-muted-fg">
                <p className="text-lg font-semibold text-foreground">Pose ta première question</p>
                <p>Écris ton exercice, joins une photo, ou choisis une action rapide ci-dessous.</p>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} imagePath={m.image_path} />
            ))}

            {pending && <MessageBubble role="user" content={pending.text} imagePath={pending.imagePath} failed={Boolean(failure)} />}

            {streamText !== null &&
              (streamText ? (
                <MessageBubble role="assistant" content={streamText} streaming />
              ) : (
                <p role="status" className="text-muted-fg">
                  Ton prof réfléchit…
                </p>
              ))}

            {failure && (
              <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-4">
                <p className="mb-3 font-semibold text-destructive">{failure}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={retry}>
                    <RotateCw className="h-4 w-4" aria-hidden /> Réessayer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelFailed}>
                    Modifier mon message
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {chatId && (
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={(t, f) => {
              setDraft("");
              void send(t, f);
            }}
            onStop={() => abortRef.current?.abort()}
            sending={sending}
            disabled={!online || Boolean(failure)}
            focusSignal={focusSignal}
          />
        )}
      </section>
    </div>
  );
}
