export type DownloadableStudyPack = { fileName: string; content: string; contentType: string };

export function downloadStudyPack(pack: DownloadableStudyPack, host = { document, URL }) {
  const blob = new Blob([pack.content], { type: pack.contentType });
  const url = host.URL.createObjectURL(blob);
  const link = host.document.createElement("a");
  link.href = url;
  link.download = pack.fileName;
  host.document.body.appendChild(link);
  link.click();
  link.remove();
  host.URL.revokeObjectURL(url);
}
