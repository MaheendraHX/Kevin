export type DownloadableStudyPack = { fileName: string; content?: string; dataBase64?: string; contentType: string };

export function downloadStudyPack(pack: DownloadableStudyPack, host = { document, URL }) {
  const binary = pack.dataBase64 ? Uint8Array.from(atob(pack.dataBase64), character => character.charCodeAt(0)) : pack.content || "";
  const blob = new Blob([binary], { type: pack.contentType });
  const url = host.URL.createObjectURL(blob);
  const link = host.document.createElement("a");
  link.href = url;
  link.download = pack.fileName;
  host.document.body.appendChild(link);
  link.click();
  link.remove();
  host.URL.revokeObjectURL(url);
}
