/** Taxa de serviço cobrada sobre o subtotal (10%) */
export const TAXA_SERVICO = 0.1

/** Lista das formas de pagamento aceitas no restaurante */
export const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Pix'] as const

/** Tipo de entrada de pagamento para um comanda */
export type PagamentoInput = { forma: string; valor: string }
