export const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const percent = (value: number) => `${value.toFixed(1).replace('.', ',')}%`

export const statusLabel: Record<string, string> = {
  new: 'Novo',
  screening: 'Triagem',
  due_diligence: 'Diligência',
  valuation: 'Valuation',
  committee: 'Comitê',
  pre_bid: 'Pré-lance',
  auction: 'Leilão',
  won: 'Arrematado',
  lost: 'Perdido',
  regularization: 'Regularização',
  renovation: 'Reforma',
  sale: 'Venda',
  rental: 'Locação',
  closed: 'Encerrado',
  rejected: 'Rejeitado',
}
