// Attribution label for household features (E). Shows "you" for the current
// user, the person's name otherwise, or null when we can't name them (e.g. a
// former member whose user_id was nulled on account deletion) so callers can
// hide the line entirely.
export function attributionLabel(
  name: string | null | undefined,
  id: string | null | undefined,
  currentUserId: string | undefined,
): string | null {
  if (id && currentUserId && id === currentUserId) return "you";
  return name || null;
}
