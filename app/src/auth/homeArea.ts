// Home area is free text (API.md §5.3), so a barangay or town Bulig doesn't list yet still fits.
// Town level on purpose: never a house address (Data Privacy Act, data minimisation).

// The longest home area accepted, matching the backend.
export const HOME_AREA_MAX = 120

// What the person typed, or "Guiuan, Eastern Samar" for an older account that saved a listed
// area's ID ("ph-eastern-samar-guiuan") before home area became text.
export function homeAreaText(
  value: string | null | undefined,
  areas: readonly { id: string; name: string; region: string }[],
): string {
  if (!value) return ''
  const listed = areas.find((a) => a.id === value)
  return listed ? `${listed.name}, ${listed.region}` : value
}
