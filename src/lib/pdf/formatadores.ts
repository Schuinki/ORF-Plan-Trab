// Caminho local do Brasão da República (deve estar em /public/brasao-republica.png)
export const BRASAO_PATH = "/brasao_republica.jpeg";

// Função para carregar imagem de caminho local e converter para base64
export async function carregarImagemBase64(
  path: string
): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatarDataExtenso(data: Date): string {
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const dia = data.getDate();
  const mes = meses[data.getMonth()];
  const ano = data.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

export function formatarDataCurta(data: Date): string {
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();
  const mesesAbrev = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];
  return `${dia}º ${mesesAbrev[mes - 1]} ${ano}`;
}
