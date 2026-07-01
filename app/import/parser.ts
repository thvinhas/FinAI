import Papa from "papaparse";
import type { ParsedTransaction, ColumnMapping } from "@/types/import";

const DEFAULT_IGNORE_KEYWORDS = [
  "saldo",
  "anterior",
  "total",
  "extrato",
  "processado",
  "estorno",
];

const DESCRIPTION_PREFIXES = [
  /^vdp-+/i,
  /^vdc-+/i,
  /^vda-+/i,
  /^\*mobi\s+/i,
];

export function cleanDescription(desc: string): string {
  let cleaned = desc.trim()
  for (const prefix of DESCRIPTION_PREFIXES) {
    cleaned = cleaned.replace(prefix, "")
  }
  return cleaned.trim()
}

export function filterGarbage(
  transactions: ParsedTransaction[],
  ignoreKeywords: string[] = [],
): ParsedTransaction[] {
  if (ignoreKeywords.length === 0 && DEFAULT_IGNORE_KEYWORDS.length === 0)
    return transactions;
  const allKeywords = [
    ...new Set([...DEFAULT_IGNORE_KEYWORDS, ...ignoreKeywords]),
  ];
  return transactions.filter((t) => {
    const lower = t.description
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const words = lower.split(/\s+/);
    return !allKeywords.some((k) => words.some((w) => w === k));
  });
}

export function extractGarbageKeywords(
  transactions: ParsedTransaction[],
  currentIgnoreKeywords: string[],
): string[] {
  const allKeywords = [
    ...new Set([...DEFAULT_IGNORE_KEYWORDS, ...currentIgnoreKeywords]),
  ];
  const freq = new Map<string, number>();
  for (const t of transactions) {
    const lower = t.description
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const words = lower.split(/\s+/).filter((w) => w.length > 1);
    for (const w of words) {
      if (allKeywords.includes(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

const DEFAULT_TRANSFER_KEYWORDS = [
  "ted",
  "pix",
  "doc",
  "transferencia",
  "transf",
  "transferência",
  "transferencia enviada",
  "transferencia recebida",
  "ted enviada",
  "ted recebida",
  "pix enviado",
  "pix recebido",
  "doc enviado",
  "doc recebido",
];

const TRANSFER_TYPE = "transferencia" as const;

function isTransfer(description: string, keywords: string[] = []): boolean {
  const allKeywords = [...DEFAULT_TRANSFER_KEYWORDS, ...keywords];
  const lower = description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return allKeywords.some((k) => lower.includes(k));
}

function classifyType(
  isReceita: boolean,
  transfer?: boolean,
): ParsedTransaction["type"] {
  if (transfer) return TRANSFER_TYPE;
  return isReceita ? "receita" : "despesa";
}

export function detectFormat(fileName: string, text: string): "csv" | "ofx" {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "ofx" || ext === "qfx") return "ofx";
  if (text.trim().startsWith("OFXHEADER") || text.includes("<OFX>"))
    return "ofx";
  return "csv";
}

export function detectCSVHeaders(text: string): string[] {
  const result = Papa.parse(text, { header: true, preview: 1 });
  return result.meta.fields ?? [];
}

export function autoDetectMapping(headers: string[]): ColumnMapping | null {
  const lower = headers.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9/]/g, ""),
  );

  const dateIdx = lower.findIndex(
    (h) =>
      /^(data|date|dt|dat|lancamento|vencimento|competencia)/.test(h) ||
      h.includes("data"),
  );

  const descIdx = lower.findIndex(
    (h) =>
      /^(descricao|description|desc|memo|historico|lancamento|nome|titulo|detalhe)/.test(
        h,
      ) ||
      h.includes("descri") ||
      h.includes("historico"),
  );

  const amtIdx = lower.findIndex(
    (h) =>
      /^(valor|val|amount|value|montante|total|preco|r\$)/.test(h) ||
      h.includes("valor") ||
      h.includes("val"),
  );

  const typeIdx = lower.findIndex((h) =>
    /^(tipo|type|tp|d\/c|dc|cred|deb|sinal|[cd]r?$)/.test(h),
  );

  if (dateIdx < 0 || descIdx < 0 || amtIdx < 0) return null;

  return {
    date: dateIdx,
    description: descIdx,
    amount: amtIdx,
    type: typeIdx >= 0 ? typeIdx : null,
  };
}

export function parseCSV(
  text: string,
  mapping?: ColumnMapping,
  transferKeywords?: string[],
): ParsedTransaction[] {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];
  if (rows.length === 0) return [];
  const headers = parsed.meta.fields ?? [];
  const col = mapping ?? autoDetectMapping(headers);
  if (!col) return [];

  const result = rows
    .map((row) => {
      const rawAmount = row[headers[col.amount]] ?? "";
      const amount = parseCurrency(rawAmount);
      const rawType = col.type != null ? (row[headers[col.type]] ?? "") : "";
      const isReceita =
        rawType.toLowerCase().includes("cred") ||
        rawType.toLowerCase().includes("receita") ||
        rawType === "C" ||
        rawType === "+" ||
        rawType === "Crédito" ||
        (rawType === "" && amount >= 0);

      const desc = cleanDescription((row[headers[col.description]] ?? "").trim());
      const isTransferencia = isTransfer(desc, transferKeywords);
      return {
        date: parseDate(row[headers[col.date]]),
        description: desc,
        amount: Math.abs(amount),
        type: classifyType(isReceita, isTransferencia),
        category_id: null,
      };
    })
    .filter((t) => t.date && t.description);

  return result;
}

export function parseOFX(
  text: string,
  transferKeywords?: string[],
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const stmts = text.split("<STMTTRN>");

  for (const stmt of stmts) {
    if (!stmt.includes("</STMTTRN>")) continue;
    const block = stmt.substring(0, stmt.indexOf("</STMTTRN>"));

    const trnType = extractTag(block, "TRNTYPE");
    const rawDate = extractTag(block, "DTPOSTED");
    const rawAmount = extractTag(block, "TRNAMT");
    const memo =
      extractTag(block, "MEMO") ||
      extractTag(block, "NAME") ||
      extractTag(block, "CHECKNUM") ||
      "";

    const amount = parseFloat(rawAmount.replace(",", "."));
    if (isNaN(amount)) continue;

    let date = rawDate;
    if (rawDate.length >= 8) {
      date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
    }

    const isCredit =
      trnType === "CREDIT" ||
      trnType === "DEP" ||
      trnType === "DEPOSIT" ||
      (trnType !== "DEBIT" &&
        trnType !== "CHECK" &&
        trnType !== "PAYMENT" &&
        amount > 0);

    const ofxDesc = cleanDescription(memo.trim());
    const isTransferencia = isTransfer(ofxDesc, transferKeywords);
    transactions.push({
      date,
      description: ofxDesc,
      amount: Math.abs(amount),
      type: classifyType(isCredit, isTransferencia),
      category_id: null,
    });
  }

  return transactions;
}

export function parseDate(value: string): string {
  const dmy = value.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return value;

  const yyyymmdd = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;

  const ddmmyyyy = value.match(/^(\d{1,2})[\/.\s](\d{1,2})[\/.\s](\d{4})$/);
  if (ddmmyyyy)
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;

  const ddmmyy = value.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2})$/);
  if (ddmmyy)
    return `20${ddmmyy[3]}-${ddmmyy[2].padStart(2, "0")}-${ddmmyy[1].padStart(2, "0")}`;

  return value;
}

export function parseCurrency(value: string): number {
  let cleaned = value.replace(/[€\s]/gi, "").trim();
  if (!cleaned) return 0;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      // European format: 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastDot > -1) {
    const dotCount = cleaned.match(/\./g)?.length ?? 0;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
    // else single dot: English decimal, keep as is
  } else if (lastComma > -1) {
    // European decimal: 1234,56
    cleaned = cleaned.replace(",", ".");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractTag(text: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}
