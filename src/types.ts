export type TipoVistoria = 'entrada' | 'saida'

export type StatusVistoria = 'rascunho' | 'pdf_gerado'

/** Referência a uma foto guardada no armazenamento (local ou Supabase). */
export interface FotoRef {
  id: string
  /** Caminho/chave do arquivo no armazenamento. */
  caminho: string
}

export interface Pessoa {
  id: string
  nome: string
  /** CPF ou CNPJ. */
  documento: string
}

/** Um bloco "texto à esquerda + fotos à direita" do laudo (cômodo, entrega das chaves...). */
export interface Secao {
  id: string
  nome: string
  descricao: string
  fotos: FotoRef[]
}

export interface Medidor {
  id: string
  nome: string
  leitura: string
  fotos: FotoRef[]
}

export interface Vistoria {
  id: string
  tipo: TipoVistoria
  status: StatusVistoria
  /** Data da vistoria (AAAA-MM-DD). */
  data: string
  endereco: string
  imb: string
  contrato: string
  locatarios: Pessoa[]
  vistoriador: string
  textoCiente: string
  medidores: Medidor[]
  tintaInterna: string
  tintaExterna: string
  comodos: Secao[]
  entregaChaves: Secao
  cidade: string
  /** Data da assinatura (AAAA-MM-DD). */
  dataAssinatura: string
  administradora: { nome: string; documento: string }
  testemunhas: Pessoa[]
  criadoEm: string
  atualizadoEm: string
  /** Laudos baixados desta vistoria (opcional: vistorias antigas não têm). */
  laudosGerados?: { formato: 'pdf' | 'docx'; em: string }[]
}

/**
 * Registro que fica guardado depois que a vistoria é concluída e apagada.
 * Não tem fotos nem textos dos cômodos: serve só para consulta.
 */
export interface RegistroHistorico {
  id: string
  tipo: TipoVistoria
  endereco: string
  imb: string
  contrato: string
  locatarios: { nome: string; documento: string }[]
  vistoriador: string
  /** Data da vistoria (AAAA-MM-DD). */
  dataVistoria: string
  totalFotos: number
  totalComodos: number
  /** Formatos de laudo baixados (PDF, Word). */
  formatos: ('pdf' | 'docx')[]
  /** Quando o primeiro laudo foi gerado. */
  laudoGeradoEm: string
  /** Quando a vistoria foi concluída e os dados apagados. */
  concluidoEm: string
  /** E-mail de quem concluiu (modo nuvem). */
  concluidoPor: string
}

export interface ResumoVistoria {
  id: string
  tipo: TipoVistoria
  status: StatusVistoria
  endereco: string
  imb: string
  locatario: string
  data: string
  totalFotos: number
  atualizadoEm: string
}

export interface Configuracoes {
  administradoraNome: string
  administradoraDocumento: string
  cidade: string
  vistoriador: string
  comodosPadrao: string[]
  textoCiente: string
}
