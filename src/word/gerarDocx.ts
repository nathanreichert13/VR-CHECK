import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from 'docx'
import { recortar } from '../lib/imagens'
import { comodosDoLaudo, pessoasPreenchidas, prepararFotos } from '../lib/laudo'
import { dataBR, dataExtenso, rotuloDocumento } from '../modelo'
import type { Repositorio } from '../storage/repo'
import type { FotoRef, Pessoa, Vistoria } from '../types'

// Medidas em twips (1 cm ≈ 567 twips). Página A4 com margens de ~1,4 cm.
const MARGEM_LADO = 800
const LARGURA_UTIL = 11906 - 2 * MARGEM_LADO // 10306
const COL_TEXTO = Math.round(LARGURA_UTIL * 0.38)
const COL_FOTOS = LARGURA_UTIL - COL_TEXTO

// Miniaturas: 3 por linha na coluna de fotos (tamanho em pixels de tela, 96 dpi).
const FOTO_W = 136
const FOTO_H = 113
// Resolução real gravada no arquivo (3x, para ficar nítida ao dar zoom/imprimir).
const FOTO_W_ARQ = FOTO_W * 3
const FOTO_H_ARQ = FOTO_H * 3

const BORDA = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const SEM_BORDA = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const BORDAS_TABELA = {
  top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA,
}
const SEM_BORDAS_TABELA = {
  top: SEM_BORDA, bottom: SEM_BORDA, left: SEM_BORDA, right: SEM_BORDA, insideHorizontal: SEM_BORDA, insideVertical: SEM_BORDA,
}

type Fotos = Map<string, Uint8Array>

/** Texto com quebras de linha preservadas. */
function corridas(texto: string, extra: { bold?: boolean; italics?: boolean } = {}): TextRun[] {
  return texto.split('\n').map((linha, i) => new TextRun({ text: linha, break: i > 0 ? 1 : 0, ...extra }))
}

function rotuloValor(rotulo: string, valor: string, alinhamento?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new Paragraph({
    alignment: alinhamento,
    children: [new TextRun({ text: `${rotulo}:`, bold: true }), new TextRun(' '), ...corridas(valor)],
  })
}

function celula(children: (Paragraph | Table)[], largura: number, opcoes: { colunas?: number; margemLado?: number } = {}) {
  const lado = opcoes.margemLado ?? 100
  return new TableCell({
    children,
    width: { size: largura, type: WidthType.DXA },
    columnSpan: opcoes.colunas,
    margins: { top: 60, bottom: 60, left: lado, right: lado },
  })
}

function paragrafoFotos(fotos: FotoRef[], dados: Fotos): Paragraph {
  const imagens: ParagraphChild[] = fotos
    .filter((f) => dados.has(f.id))
    .map(
      (f) =>
        new ImageRun({
          type: 'jpg',
          data: dados.get(f.id)!,
          transformation: { width: FOTO_W, height: FOTO_H },
        }),
    )
  return new Paragraph({ children: imagens })
}

/** Linha "texto à esquerda + fotos à direita" (cômodos, medidores, entrega das chaves). */
function linhaComFotos(titulo: string, texto: string, fotos: FotoRef[], dados: Fotos): TableRow {
  return new TableRow({
    children: [
      celula([rotuloValor(titulo, texto, AlignmentType.JUSTIFIED)], COL_TEXTO),
      celula([paragrafoFotos(fotos, dados)], COL_FOTOS, { margemLado: 30 }),
    ],
  })
}

function linhaSimples(rotulo: string, valor: string): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [
      celula([new Paragraph({ children: [new TextRun({ text: `${rotulo}:`, bold: true })] })], COL_TEXTO),
      celula([new Paragraph({ children: corridas(valor) })], COL_FOTOS),
    ],
  })
}

function linhaInteira(children: Paragraph[]): TableRow {
  return new TableRow({ cantSplit: true, children: [celula(children, LARGURA_UTIL, { colunas: 2 })] })
}

function assinatura(papel: string, nome: string, documento: string): TableCell {
  const centro = (t: string) => new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new TextRun(t)] })
  const linhas = [centro('_________________________________')]
  if (papel) linhas.push(centro(papel))
  linhas.push(centro(nome || ' '))
  if (documento) linhas.push(centro(`${rotuloDocumento(documento)}: ${documento}`))
  linhas.push(new Paragraph({ spacing: { after: 400 }, children: [] }))
  return new TableCell({ children: linhas, width: { size: LARGURA_UTIL / 2, type: WidthType.DXA } })
}

function tabelaAssinaturas(celulas: TableCell[]): Table {
  const linhas: TableRow[] = []
  for (let i = 0; i < celulas.length; i += 2) {
    const par = celulas.slice(i, i + 2)
    if (par.length === 1) par.push(new TableCell({ children: [new Paragraph('')], width: { size: LARGURA_UTIL / 2, type: WidthType.DXA } }))
    linhas.push(new TableRow({ cantSplit: true, children: par }))
  }
  return new Table({
    rows: linhas,
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [LARGURA_UTIL / 2, LARGURA_UTIL / 2],
    layout: TableLayoutType.FIXED,
    borders: SEM_BORDAS_TABELA,
  })
}

function montarDocumento(v: Vistoria, dados: Fotos): Document {
  const tipo = v.tipo === 'entrada' ? 'entrada' : 'saída'
  const locatarios = pessoasPreenchidas(v.locatarios)
  const testemunhas = pessoasPreenchidas(v.testemunhas)

  const cabecalhoLocatarios: Paragraph[] = locatarios.length
    ? locatarios.flatMap((l: Pessoa) => [
        rotuloValor('Locatário(a)', l.nome),
        ...(l.documento ? [rotuloValor(rotuloDocumento(l.documento), l.documento)] : []),
      ])
    : [new Paragraph('')]

  const linhas: TableRow[] = [
    new TableRow({
      cantSplit: true,
      children: [
        celula(
          [
            rotuloValor('Endereço', v.endereco),
            ...(v.imb ? [rotuloValor('Imb', v.imb)] : []),
            ...(v.contrato ? [rotuloValor('N. do contrato', v.contrato)] : []),
          ],
          COL_TEXTO,
        ),
        celula(cabecalhoLocatarios, COL_FOTOS),
      ],
    }),
    linhaInteira([rotuloValor('Vistoria realizada por', v.vistoriador)]),
  ]

  if (v.textoCiente.trim()) {
    linhas.push(
      linhaInteira([
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: corridas(v.textoCiente, { italics: true }) }),
        new Paragraph({ spacing: { before: 400 }, children: [new TextRun('Ciente_________________________________')] }),
      ]),
    )
  }
  v.medidores.forEach((m) => linhas.push(linhaComFotos(m.nome, m.leitura, m.fotos, dados)))
  if (v.tintaInterna.trim()) linhas.push(linhaSimples('Cor tinta interna', v.tintaInterna))
  if (v.tintaExterna.trim()) linhas.push(linhaSimples('Cor tinta externa', v.tintaExterna))
  comodosDoLaudo(v).forEach((c) => linhas.push(linhaComFotos(c.nome, c.descricao, c.fotos, dados)))
  const ch = v.entregaChaves
  if (ch.descricao.trim() || ch.fotos.length) linhas.push(linhaComFotos(ch.nome, ch.descricao, ch.fotos, dados))

  const tabela = new Table({
    rows: linhas,
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [COL_TEXTO, COL_FOTOS],
    layout: TableLayoutType.FIXED,
    borders: BORDAS_TABELA,
  })

  const assinaturas = [
    ...(locatarios.length ? locatarios : [{ id: 'x', nome: '', documento: '' }]).map((l) =>
      assinatura('LOCATÁRIO(A)', l.nome, l.documento),
    ),
    assinatura('ADMINISTRADORA', v.administradora.nome, v.administradora.documento),
  ]

  const fechamento: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      keepNext: true,
      spacing: { before: 200, after: 700 },
      children: [new TextRun(`${v.cidade ? `${v.cidade}, ` : ''}${dataExtenso(v.dataAssinatura)}.`)],
    }),
    tabelaAssinaturas(assinaturas),
  ]
  if (testemunhas.length) {
    fechamento.push(
      new Paragraph({
        keepNext: true, // não deixa o título sozinho no fim da página
        spacing: { before: 200, after: 600 },
        children: [new TextRun({ text: 'TESTEMUNHAS', underline: {} })],
      }),
      tabelaAssinaturas(testemunhas.map((t) => assinatura('', t.nome, t.documento))),
    )
  }

  return new Document({
    creator: 'VR-CHECK',
    title: `Vistoria de ${tipo} - ${v.endereco}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 680, bottom: 800, left: MARGEM_LADO, right: MARGEM_LADO, footer: 400 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 16, color: '666666' }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: `Vistoria de ${tipo} do imóvel`, bold: true, size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Data: ${dataBR(v.data)}`, bold: true, size: 22 })],
          }),
          tabela,
          ...fechamento,
        ],
      },
    ],
  })
}

/**
 * Gera o laudo em Word (.docx) no próprio navegador, no mesmo layout do PDF.
 * O arquivo pode ser editado depois no Word.
 */
export async function gerarLaudoDocx(
  v: Vistoria,
  repo: Repositorio,
  progresso: (etapa: string) => void,
): Promise<{ blob: Blob; falhas: number }> {
  const { fotos, falhas } = await prepararFotos(v, repo, (original) => recortar(original, FOTO_W_ARQ, FOTO_H_ARQ), progresso)
  progresso('Montando o Word…')
  const dados: Fotos = new Map()
  for (const [id, blob] of fotos) dados.set(id, new Uint8Array(await blob.arrayBuffer()))
  const blob = await Packer.toBlob(montarDocumento(v, dados))
  return { blob, falhas }
}
