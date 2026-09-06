export function addId<T extends Record<string, any>>(doc: T): T & { id: string } {
  const id = String(doc._id)
  return { ...doc, id }
}

export function addIdArray<T extends Record<string, any>>(docs: T[]): (T & { id: string })[] {
  return docs.map(addId)
}
