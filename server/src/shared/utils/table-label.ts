// Helper para representar una mesa fusionada como una sola etiqueta ("1 + 2").
// Un pedido vive en la mesa "representante" de la fusión (la de destino) y esa
// mesa conoce sus mesas fusionadas vía la relación mergedSources.

// Fragmento de `select` de Prisma para traer la info necesaria de la mesa.
export const tableLabelSelect = {
  number: true,
  mergedSources: { select: { number: true }, orderBy: { number: 'asc' } },
} as const;

type TableLabelInput =
  | { number: number; mergedSources?: { number: number }[] }
  | null
  | undefined;

// Devuelve los números de la fusión ordenados, p. ej. [1, 2]. Si no hay mesa, [].
export function tableNumbers(table: TableLabelInput): number[] {
  if (!table) return [];
  const nums = [table.number, ...((table.mergedSources ?? []).map((s) => s.number))];
  return nums.sort((a, b) => a - b);
}

// Devuelve la etiqueta de la fusión: "1 + 2", o "2" si no está fusionada, o null.
export function formatTableLabel(table: TableLabelInput): string | null {
  const nums = tableNumbers(table);
  if (nums.length === 0) return null;
  return nums.join(' + ');
}
