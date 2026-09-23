/**
 * What the teammate actually produced.
 *
 * Before this existed, a teammate could spend ten minutes building a deck and
 * the only trace was a paragraph saying it had. The file was real — sitting in
 * the container's `/workspace` — but nothing in the product knew, so nobody
 * could open it. That is the gap between a thing that talks about work and a
 * thing that does it.
 *
 * Every entry is a download link and nothing else. There is no preview, and
 * that is a decision rather than a gap: a teammate writes files out of things
 * it read on the web, so rendering one inline would run whatever it saved on
 * the dashboard's own origin. The server sends everything as an attachment with
 * `nosniff` for the same reason. If previews arrive later they render
 * structured data the server extracted — never the file's own markup.
 *
 * A zero-byte file is shown, marked, rather than hidden. It is the visible half
 * of the delivery check: a script that died inside `save()` leaves an empty
 * shell, and an operator who can see "0 bytes" understands immediately what an
 * absent row would have left them guessing about.
 */

import {
  Archive, Download, FileCode2, FileSpreadsheet, FileText, Image as ImageIcon,
  Database, Presentation, File as FileIcon,
} from "lucide-react";
import type { Artifact } from "../domain/types";

const ICONS = {
  slides: Presentation,
  document: FileText,
  sheet: FileSpreadsheet,
  image: ImageIcon,
  data: Database,
  text: FileText,
  code: FileCode2,
  archive: Archive,
  file: FileIcon,
} as const;

/** Bytes as somebody reads them. Deliberately shows "0 bytes" rather than "—". */
function readableSize(bytes: number): string {
  if (bytes === 0) return "0 bytes";
  const units = ["bytes", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

function readableWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FilesPanel({ agentName, artifacts, urlFor }: {
  agentName: string;
  artifacts: Artifact[];
  urlFor(artifact: Artifact): string;
}) {
  if (artifacts.length === 0) {
    return <p className="files-empty">
      {agentName} has not produced any files yet.
    </p>;
  }

  return <ul className="files-list">
    {artifacts.map((artifact) => {
      const Icon = ICONS[artifact.kind] ?? FileIcon;
      const empty = artifact.size === 0;
      return <li className={`files-row ${empty ? "is-empty" : ""}`} key={artifact.id}>
        <a
          href={urlFor(artifact)}
          download={artifact.name}
          // Not `target="_blank"`: the response is an attachment either way, and
          // a new tab that immediately closes itself is worse than no new tab.
          className="files-link"
        >
          <Icon size={15} />
          <span className="files-name" title={artifact.path}>{artifact.name}</span>
          <span className="files-meta">
            {readableSize(artifact.size)}
            {empty && <span className="files-warning" title="Nothing was written to this file">
              didn't finish
            </span>}
          </span>
          <span className="files-when">{readableWhen(artifact.updatedAt)}</span>
          <Download size={13} className="files-download" />
        </a>
      </li>;
    })}
  </ul>;
}
