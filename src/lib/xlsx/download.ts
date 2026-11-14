import type { Workbook } from "exceljs";

/** Nomes de aba do Excel: máx. 31 caracteres, sem \ / ? * [ ] : */
export function sanitizarNomeAba(nome: string): string {
  return nome.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
}

export async function baixarWorkbook(
  workbook: Workbook,
  nomeArquivo: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
