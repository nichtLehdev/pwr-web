"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { Note } from "@/app/_components/programmheft/note";
import { useToast } from "@/app/_components/ui/toast";
import {
  ScrollableModal,
  ScrollableModalBody,
  ScrollableModalCard,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { formatBerlin } from "@/lib/berlin-time";
import {
  DELETION_REASON_MAX_LENGTH,
  type DeletionContentType,
} from "@/lib/deletion-request";

type Props = { contentType: DeletionContentType; contentId: string };

// Alle drei maskulin, daher passt danach „er“.
const ACCUSATIVE: Record<DeletionContentType, string> = {
  post: "Diesen Beitrag",
  event: "Diesen Termin",
  course: "Diesen Kurs",
};

const BTN_OUTLINE =
  "border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BTN_DANGER =
  "inline-flex min-h-11 items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";
const TEXTAREA =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2";

function useDeletionRequest({ contentType, contentId }: Props) {
  return api.deletionRequests.forContent.useQuery(
    { contentType, contentId },
    { enabled: !!contentId },
  );
}

/** Pflichtbegründung in einem Dialog; gemeinsam für Antrag und Ablehnung. */
function ReasonDialog(props: {
  title: string;
  intro: string;
  placeholder: string;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const fieldId = useId();
  return (
    <ScrollableModal>
      <ScrollableModalCard maxW="md">
        <ScrollableModalBody>
          <h3 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
            {props.title}
          </h3>
          <label
            htmlFor={fieldId}
            className="text-dark dark:text-night-muted mb-4 block text-sm"
          >
            {props.intro}
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={DELETION_REASON_MAX_LENGTH}
            placeholder={props.placeholder}
            className={TEXTAREA}
            required
          />
        </ScrollableModalBody>
        <ScrollableModalFooter>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className={BTN_OUTLINE}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => props.onSubmit(text.trim())}
              disabled={!text.trim() || props.isPending}
              className={BTN_DANGER}
            >
              {props.isPending ? props.pendingLabel : props.submitLabel}
            </button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}

/** Knopf für die Kopfzeile: nur für Leute, die den Inhalt nicht selbst löschen dürfen. */
export function DeletionRequestButton(props: Props) {
  const toast = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const { data } = useDeletionRequest(props);
  const create = api.deletionRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Löschung beantragt");
      setOpen(false);
      void utils.deletionRequests.forContent.invalidate(props);
    },
    onError: (error) => toast.error(error.message),
  });

  if (!data?.canRequest || data.openRequest) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dark:bg-night bg-paper inline-flex min-h-11 items-center gap-2 border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
        Löschung beantragen
      </button>
      {open && (
        <ReasonDialog
          title="Löschung beantragen"
          intro={`${ACCUSATIVE[props.contentType]} kannst du nicht selbst löschen. Schreib kurz, warum er weg soll – die Redaktion wird benachrichtigt und entscheidet.`}
          placeholder="z. B. Termin fällt aus, doppelt angelegt …"
          submitLabel="Antrag senden"
          pendingLabel="Wird gesendet..."
          isPending={create.isPending}
          onSubmit={(reason) => create.mutate({ ...props, reason })}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Hinweis auf einen offenen Antrag; wer löschen darf, entscheidet direkt hier. */
export function DeletionRequestNotice(props: Props & { onDelete: () => void }) {
  const { contentType, contentId, onDelete } = props;
  const toast = useToast();
  const utils = api.useUtils();
  const [declining, setDeclining] = useState(false);
  const { data } = useDeletionRequest({ contentType, contentId });
  const decline = api.deletionRequests.decline.useMutation({
    onSuccess: () => {
      toast.info("Löschantrag abgelehnt");
      setDeclining(false);
      void utils.deletionRequests.forContent.invalidate({
        contentType,
        contentId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const request = data?.openRequest;
  if (!request) return null;

  const who = request.isMine
    ? "Du hast"
    : `${request.requesterName ?? "Jemand"} hat`;
  return (
    <>
      <Note tone="important" title="Löschung beantragt" className="mb-6">
        <p>
          {who} am {formatBerlin(request.createdAt, "datumUhrzeit")} Uhr die
          Löschung beantragt:
        </p>
        <p className="break-words whitespace-pre-wrap italic">
          „{request.reason}“
        </p>
        {data.canDecide ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={onDelete} className={BTN_DANGER}>
              <Trash2 className="h-4 w-4" />
              Jetzt löschen
            </button>
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className="border-ink text-ink hover:bg-ink/10 inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
            >
              Antrag ablehnen
            </button>
          </div>
        ) : (
          <p>Die Redaktion ist benachrichtigt und entscheidet darüber.</p>
        )}
      </Note>
      {declining && (
        <ReasonDialog
          title="Löschantrag ablehnen"
          intro="Warum bleibt der Inhalt? Die antragstellende Person bekommt deine Begründung."
          placeholder="Begründung für die Ablehnung..."
          submitLabel="Ablehnen"
          pendingLabel="Wird abgelehnt..."
          isPending={decline.isPending}
          onSubmit={(note) => decline.mutate({ id: request.id, note })}
          onClose={() => setDeclining(false)}
        />
      )}
    </>
  );
}
