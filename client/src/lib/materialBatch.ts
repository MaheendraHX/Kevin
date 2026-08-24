export type UploadFileIdentity = Pick<File, "name" | "size" | "lastModified" | "type">;

export function isPdfUploadFile(file: Pick<File, "name" | "type">) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function fileKey(file: UploadFileIdentity) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function mergeUniquePdfFiles<T extends UploadFileIdentity>(existing: readonly T[], incoming: readonly T[]) {
  const known = new Set(existing.map(fileKey));
  return incoming.filter(file => {
    const key = fileKey(file);
    if (!isPdfUploadFile(file) || known.has(key)) return false;
    known.add(key);
    return true;
  });
}
