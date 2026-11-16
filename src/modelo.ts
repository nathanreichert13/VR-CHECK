import type { Configuracoes, FotoRef, Medidor, Pessoa, RegistroHistorico, ResumoVistoria, Secao, Vistoria } from './types'

/** Gera um id único. Funciona também fora de HTTPS (ex.: teste pelo IP da rede local). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && window.isSecureContext) {
    return crypto.randomUUID()
  }
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function hojeISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const COMODOS_PADRAO = [
  'Entrada',
  'Sala de estar',
  'Sala de jantar',
  'Cozinha',
  'Fundos',
  'Corredor lateral',
  'Lavanderia',
  'Lavabo',
  'Escadaria',
  'Quarto suíte',
  'Banheiro suíte',
  'Quarto 2',
  'Quarto 3',
  'Banheiro social',
]

export const TEXTO_CIENTE_PADRAO =
  'Abaixo fotos realizadas na vistoria, elas foram analisadas e após assinatura deste se torna documento apto para comprovação judicial.'

export const CONFIG_PADRAO: Configuracoes = {
  administradoraNome: '',
  administradoraDocumento: '',
  cidade: '',
  vistoriador: '',
  comodosPadrao: COMODOS_PADRAO,
  textoCiente: TEXTO_CIENTE_PADRAO,
}

const CHAVE_CONFIG = 'vrcheck.config'

export function carregarConfig(): Configuracoes {
  try {
    const bruto = localStorage.getItem(CHAVE_CONFIG)
    if (bruto) return { ...CONFIG_PADRAO, ...(JSON.parse(bruto) as Partial<Configuracoes>) }
  } catch {
    /* sem acesso ao armazenamento: usa o padrão */
  }
  return { ...CONFIG_PADRAO }
}

export function salvarConfig(c: Configuracoes): void {
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify(c))
  } catch {
    /* ignora */
  }
}

export function novaSecao(nome: string): Secao {
  return { id: uid(), nome, descricao: '', fotos: [] }
}

export function novaPessoa(): Pessoa {
  return { id: uid(), nome: '', documento: '' }
}

export function novoMedidor(nome: string): Medidor {
  return { id: uid(), nome, leitura: '', fotos: [] }
}

export function criarVistoria(config: Configuracoes): Vistoria {
  const agora = new Date().toISOString()
  return {
    id: uid(),
    tipo: 'entrada',
    status: 'rascunho',
    data: hojeISO(),
    endereco: '',
    imb: '',
    contrato: '',
    locatarios: [novaPessoa()],
    vistoriador: config.vistoriador,
    textoCiente: config.textoCiente,
    medidores: [novoMedidor('Medidor de água'), novoMedidor('Medidor de luz')],
    tintaInterna: '',
    tintaExterna: '',
    comodos: config.comodosPadrao.map(novaSecao),
    entregaChaves: novaSecao('Entrega das chaves'),
    cidade: config.cidade,
    dataAssinatura: hojeISO(),
    administradora: { nome: config.administradoraNome, documento: config.administradoraDocumento },
    testemunhas: [novaPessoa(), novaPessoa()],
    criadoEm: agora,
    atualizadoEm: agora,
  }
}

export function todasFotos(v: Vistoria): FotoRef[] {
  return [
    ...v.medidores.flatMap((m) => m.fotos),
    ...v.comodos.flatMap((c) => c.fotos),
    ...v.entregaChaves.fotos,
  ]
}

export function resumir(v: Vistoria): ResumoVistoria {
  return {
    id: v.id,
    tipo: v.tipo,
    status: v.status,
    endereco: v.endereco,
    imb: v.imb,
    locatario: v.locatarios.map((l) => l.nome).filter(Boolean).join(', '),
    data: v.data,
    totalFotos: todasFotos(v).length,
    atualizadoEm: v.atualizadoEm,
  }
}

/** Monta o registro de histórico (sem fotos nem textos) de uma vistoria concluída. */
export function paraHistorico(v: Vistoria): RegistroHistorico {
  const agora = new Date().toISOString()
  const laudos = v.laudosGerados ?? []
  return {
    id: v.id,
    tipo: v.tipo,
    endereco: v.endereco,
    imb: v.imb,
    contrato: v.contrato,
    locatarios: v.locatarios
      .filter((l) => l.nome.trim() || l.documento.trim())
      .map((l) => ({ nome: l.nome, documento: l.documento })),
    vistoriador: v.vistoriador,
    dataVistoria: v.data,
    totalFotos: todasFotos(v).length,
    totalComodos: v.comodos.filter((c) => c.descricao.trim() || c.fotos.length).length,
    formatos: [...new Set(laudos.map((l) => l.formato))],
    laudoGeradoEm: laudos[0]?.em ?? agora,
    concluidoEm: agora,
    concluidoPor: '',
    criadoPor: v.criadoPor ?? '',
  }
}

/** AAAA-MM-DD -> DD/MM/AAAA */
export function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** AAAA-MM-DD -> "10 de setembro de 2024" */
export function dataExtenso(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  return `${d} de ${MESES[m - 1]} de ${a}`
}

/** Máscara de CPF (11 dígitos) ou CNPJ (14 dígitos) enquanto digita. */
export function mascararDocumento(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 14)
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return n
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export type SituacaoDocumento = 'vazio' | 'ok' | 'incompleto' | 'invalido'

function cpfValido(n: string): boolean {
  if (/^(\d)\1{10}$/.test(n)) return false // 000.000.000-00, 111.111.111-11...
  const dv = (ate: number) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(n[i]) * (ate + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(n[9]) && dv(10) === Number(n[10])
}

function cnpjValido(n: string): boolean {
  if (/^(\d)\1{13}$/.test(n)) return false
  const dv = (pesos: number[]) => {
    const soma = pesos.reduce((s, p, i) => s + p * Number(n[i]), 0)
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return dv(p1) === Number(n[12]) && dv([6, ...p1]) === Number(n[13])
}

/**
 * Confere CPF (11 dígitos) ou CNPJ (14 dígitos) pelos dígitos verificadores.
 * Não consulta a Receita: só detecta documento incompleto ou digitado errado.
 */
export function validarDocumento(doc: string): { situacao: SituacaoDocumento; mensagem: string } {
  const n = doc.replace(/\D/g, '')
  if (n.length === 0) return { situacao: 'vazio', mensagem: '' }
  if (n.length < 11) {
    const faltam = 11 - n.length
    return { situacao: 'incompleto', mensagem: `CPF incompleto: falta${faltam > 1 ? 'm' : ''} ${faltam} dígito${faltam > 1 ? 's' : ''}` }
  }
  if (n.length === 11) {
    return cpfValido(n)
      ? { situacao: 'ok', mensagem: '' }
      : { situacao: 'invalido', mensagem: 'CPF inválido: confira os números' }
  }
  if (n.length < 14) {
    return { situacao: 'incompleto', mensagem: 'Documento incompleto: CPF tem 11 dígitos e CNPJ tem 14' }
  }
  return cnpjValido(n)
    ? { situacao: 'ok', mensagem: '' }
    : { situacao: 'invalido', mensagem: 'CNPJ inválido: confira os números' }
}

export function rotuloDocumento(doc: string): string {
  return doc.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'
}
