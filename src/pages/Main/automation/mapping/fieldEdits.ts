/**
 * Which edited fields a save covered. Each edit bumps its field's count; a save notes the counts
 * of the fields it carries when it starts; when it lands, only the fields not edited again since
 * are saved - a field picked again while the save was on its way still has an edit to send.
 */
export const createEditCounter = () => {
  const counts = new Map<string, number>()
  const countOf = (key: string) => counts.get(key) ?? 0
  return {
    /** The person changed this field. */
    edit: (key: string) => {
      counts.set(key, countOf(key) + 1)
    },
    /** The counts of these fields as a save starts. */
    snapshot: (keys: Iterable<string>) =>
      new Map(Array.from(keys, (key) => [key, countOf(key)] as const)),
    /** Of the fields a save carried, those not edited since it started. */
    unchangedSince: (snapshot: Map<string, number>) =>
      Array.from(snapshot)
        .filter(([key, count]) => countOf(key) === count)
        .map(([key]) => key),
  }
}

export type EditCounter = ReturnType<typeof createEditCounter>
