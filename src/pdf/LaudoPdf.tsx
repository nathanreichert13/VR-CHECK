import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { comodosDoLaudo, pessoasPreenchidas } from '../lib/laudo'
import { dataBR, dataExtenso, rotuloDocumento } from '../modelo'
import type { FotoRef, Vistoria } from '../types'

// Sem hifenização automática (a padrão usa regras do inglês e quebra palavras em português).
Font.registerHyphenationCallback((palavra) => [palavra])

const BORDA = '#000'

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 40, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.25 },
  titulo: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  subtitulo: { fontFamily: 'Helvetica-Bold', fontSize: 11, textAlign: 'center', marginBottom: 10 },
  tabela: { borderTopWidth: 1, borderColor: BORDA },
  linha: { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDA },
  celulaMetade: { width: '50%', padding: 4 },
  celulaTexto: { width: '38%', padding: 4, borderRightWidth: 1, borderColor: BORDA },
  celulaFotos: { width: '62%', padding: 1 },
  linhaFotos: { flexDirection: 'row', width: '100%' },
  celulaValor: { width: '62%', padding: 4 },
  celulaInteira: { width: '100%', padding: 4 },
  negrito: { fontFamily: 'Helvetica-Bold' },
  italico: { fontFamily: 'Helvetica-Oblique', textAlign: 'justify' },
  justificado: { textAlign: 'justify' },
  foto: { width: '33.333%', height: 88, padding: 1 },
  imagem: { width: '100%', height: '100%', objectFit: 'cover' },
  local: { textAlign: 'right', marginTop: 10, marginBottom: 36 },
  assinaturas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  assinatura: { width: '47%', alignItems: 'center', marginBottom: 30 },
  traco: { width: '100%', borderTopWidth: 0.8, borderColor: BORDA, marginBottom: 3 },
  centro: { textAlign: 'center' },
  testemunhasTitulo: { textDecoration: 'underline', marginBottom: 34 },
  rodape: { position: 'absolute', bottom: 18, left: 40, right: 40, fontSize: 8, color: '#666', textAlign: 'right' },
})

type Urls = Record<string, string>

const FOTOS_POR_LINHA = 3

/** Grade de fotos montada em linhas fixas de 3 (flexWrap quebra mal entre páginas). */
function GradeFotos({ fotos, urls }: { fotos: FotoRef[]; urls: Urls }) {
  const validas = fotos.filter((f) => urls[f.id])
  const linhas: FotoRef[][] = []
  for (let i = 0; i < validas.length; i += FOTOS_POR_LINHA) linhas.push(validas.slice(i, i + FOTOS_POR_LINHA))
  return (
    <View style={s.celulaFotos}>
      {linhas.map((linha) => (
        <View key={linha[0].id} style={s.linhaFotos} wrap={false}>
          {linha.map((f) => (
            <View key={f.id} style={s.foto}>
              <Image src={urls[f.id]} style={s.imagem} />
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function LinhaComFotos({ titulo, texto, fotos, urls }: { titulo: string; texto: string; fotos: FotoRef[]; urls: Urls }) {
  return (
    <View style={s.linha}>
      <View style={s.celulaTexto}>
        <Text style={s.justificado}>
          <Text style={s.negrito}>{titulo}:</Text> {texto}
        </Text>
      </View>
      <GradeFotos fotos={fotos} urls={urls} />
    </View>
  )
}

function Assinatura({ papel, nome, documento }: { papel: string; nome: string; documento: string }) {
  return (
    <View style={s.assinatura} wrap={false}>
      <View style={s.traco} />
      {papel ? <Text style={s.centro}>{papel}</Text> : null}
      <Text style={s.centro}>{nome || ' '}</Text>
      {documento ? <Text style={s.centro}>{`${rotuloDocumento(documento)}: ${documento}`}</Text> : null}
    </View>
  )
}

export default function LaudoPdf({ v, urls }: { v: Vistoria; urls: Urls }) {
  const locatarios = pessoasPreenchidas(v.locatarios)
  const testemunhas = pessoasPreenchidas(v.testemunhas)
  const comodos = comodosDoLaudo(v)
  const chaves = v.entregaChaves
  const tipo = v.tipo === 'entrada' ? 'entrada' : 'saída'

  return (
    <Document title={`Vistoria de ${tipo} - ${v.endereco}`} author={v.administradora.nome} creator="VR-CHECK" language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <Text style={s.titulo}>Vistoria de {tipo} do imóvel</Text>
        <Text style={s.subtitulo}>Data: {dataBR(v.data)}</Text>

        <View style={s.tabela}>
          <View style={s.linha} wrap={false}>
            <View style={[s.celulaMetade, { borderRightWidth: 1, borderColor: BORDA }]}>
              <Text>
                <Text style={s.negrito}>Endereço:</Text> {v.endereco}
              </Text>
              {v.imb ? (
                <Text>
                  <Text style={s.negrito}>Imb:</Text> {v.imb}
                </Text>
              ) : null}
              {v.contrato ? (
                <Text>
                  <Text style={s.negrito}>N. do contrato:</Text> {v.contrato}
                </Text>
              ) : null}
            </View>
            <View style={s.celulaMetade}>
              {locatarios.map((l) => (
                <View key={l.id} style={{ marginBottom: 2 }}>
                  <Text>
                    <Text style={s.negrito}>Locatário(a):</Text> {l.nome}
                  </Text>
                  {l.documento ? (
                    <Text>
                      <Text style={s.negrito}>{rotuloDocumento(l.documento)}:</Text> {l.documento}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          <View style={s.linha} wrap={false}>
            <View style={s.celulaInteira}>
              <Text>
                <Text style={s.negrito}>Vistoria realizada por:</Text> {v.vistoriador}
              </Text>
            </View>
          </View>

          {v.textoCiente.trim() ? (
            <View style={s.linha} wrap={false}>
              <View style={s.celulaInteira}>
                <Text style={s.italico}>{v.textoCiente}</Text>
                <Text style={{ marginTop: 26 }}>Ciente_________________________________</Text>
              </View>
            </View>
          ) : null}

          {v.medidores.map((m) => (
            <LinhaComFotos key={m.id} titulo={m.nome} texto={m.leitura} fotos={m.fotos} urls={urls} />
          ))}

          {v.tintaInterna.trim() ? (
            <View style={s.linha} wrap={false}>
              <View style={s.celulaTexto}>
                <Text style={s.negrito}>Cor tinta interna:</Text>
              </View>
              <View style={s.celulaValor}>
                <Text>{v.tintaInterna}</Text>
              </View>
            </View>
          ) : null}
          {v.tintaExterna.trim() ? (
            <View style={s.linha} wrap={false}>
              <View style={s.celulaTexto}>
                <Text style={s.negrito}>Cor tinta externa:</Text>
              </View>
              <View style={s.celulaValor}>
                <Text>{v.tintaExterna}</Text>
              </View>
            </View>
          ) : null}

          {comodos.map((c) => (
            <LinhaComFotos key={c.id} titulo={c.nome} texto={c.descricao} fotos={c.fotos} urls={urls} />
          ))}

          {chaves.descricao.trim() || chaves.fotos.length ? (
            <LinhaComFotos titulo={chaves.nome} texto={chaves.descricao} fotos={chaves.fotos} urls={urls} />
          ) : null}
        </View>

        <View wrap={false}>
          <Text style={s.local}>
            {v.cidade ? `${v.cidade}, ` : ''}
            {dataExtenso(v.dataAssinatura)}.
          </Text>
          <View style={s.assinaturas}>
            {(locatarios.length ? locatarios : [{ id: 'x', nome: '', documento: '' }]).map((l) => (
              <Assinatura key={l.id} papel="LOCATÁRIO(A)" nome={l.nome} documento={l.documento} />
            ))}
            <Assinatura papel="ADMINISTRADORA" nome={v.administradora.nome} documento={v.administradora.documento} />
          </View>
        </View>

        {testemunhas.length > 0 && (
          <View wrap={false}>
            <Text style={s.testemunhasTitulo}>TESTEMUNHAS</Text>
            <View style={s.assinaturas}>
              {testemunhas.map((t) => (
                <Assinatura key={t.id} papel="" nome={t.nome} documento={t.documento} />
              ))}
            </View>
          </View>
        )}

        <Text style={s.rodape} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}
