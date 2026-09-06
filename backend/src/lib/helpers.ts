export function withId<T extends Record<string, any>>(doc: T): T & { id: string } {
  return { ...doc, id: String(doc._id) }
}

export function withIdArray<T extends Record<string, any>>(docs: T[]): (T & { id: string })[] {
  return docs.map(withId)
}
