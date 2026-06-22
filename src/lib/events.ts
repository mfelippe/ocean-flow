/** Eventos que um webhook pode assinar (vazio = todos). */
export const WEBHOOK_EVENTS = [
  { value: "CARD_CREATED", label: "Card criado" },
  { value: "CARD_MOVED", label: "Card movido" },
  { value: "CARD_UPDATED", label: "Card editado" },
  { value: "CARD_ARCHIVED", label: "Card arquivado" },
  { value: "COMMENT_ADDED", label: "Comentário" },
  { value: "ATTACHMENT_ADDED", label: "Anexo" },
] as const;

export const WEBHOOK_EVENT_VALUES: string[] = WEBHOOK_EVENTS.map(
  (e) => e.value,
);

export function eventLabel(value: string): string {
  return WEBHOOK_EVENTS.find((e) => e.value === value)?.label ?? value;
}
