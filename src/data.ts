export type Profile = 'lojista' | 'expositor';
export type Edition = { id: string; city: string; state: string; uf: string; region: string; dates: string; shortDate: string; start: string; end: string; order: string; x: number; y: number };
export const editions: Edition[] = [
  { id:'sao-luis', city:'São Luís', state:'Maranhão', uf:'MA', region:'Nordeste', dates:'29 de junho a 1º de julho de 2027', shortDate:'29 JUN — 01 JUL', start:'20270629', end:'20270702', order:'01', x:73.18, y:23.00 },
  { id:'fortaleza', city:'Fortaleza', state:'Ceará', uf:'CE', region:'Nordeste', dates:'6 a 8 de julho de 2027', shortDate:'06 — 08 JUL', start:'20270706', end:'20270709', order:'02', x:86.42, y:25.74 },
  { id:'caruaru', city:'Caruaru', state:'Pernambuco', uf:'PE', region:'Nordeste', dates:'13 a 15 de julho de 2027', shortDate:'13 — 15 JUL', start:'20270713', end:'20270716', order:'03', x:92.30, y:36.26 },
  { id:'feira-de-santana', city:'Feira de Santana', state:'Bahia', uf:'BA', region:'Nordeste', dates:'20 a 22 de julho de 2027', shortDate:'20 — 22 JUL', start:'20270720', end:'20270723', order:'04', x:85.45, y:45.44 },
  { id:'goiania', city:'Goiânia', state:'Goiás', uf:'GO', region:'Centro-Oeste', dates:'27 a 29 de julho de 2027', shortDate:'27 — 29 JUL', start:'20270727', end:'20270730', order:'05', x:61.79, y:55.64 },
  { id:'piracicaba', city:'Piracicaba', state:'São Paulo', uf:'SP', region:'Sudeste', dates:'17 a 19 de agosto de 2027', shortDate:'17 — 19 AGO', start:'20270817', end:'20270820', order:'06', x:65.49, y:69.57 },
];
export const visitorFaqs = [
 ['Quem pode visitar e quanto custa a entrada?','A entrada é gratuita para lojistas com CNPJ ou MEI. A feira é voltada a quem compra brinquedos e presentes em quantidade.'],
 ['Quando abre o credenciamento de 2027?','O credenciamento de lojistas ainda não está aberto. As orientações de cadastro e acesso serão divulgadas por cidade em uma etapa futura.'],
 ['O que posso conhecer na feira?','Você pode ver produtos e lançamentos apresentados pelos expositores, observar tendências do mercado e conversar com fabricantes e representantes. A programação de cada edição será confirmada pela organização.'],
 ['Posso encontrar melhores preços?','A feira é uma oportunidade para comparar preços e condições comerciais para compras em quantidade diretamente com os fornecedores. Cada expositor define sua política; o site não garante um preço específico.'],
 ['Onde será a edição e em quais horários?','As datas estão anunciadas. Endereço e horários serão informados pela organização para cada cidade.'],
 ['Quais marcas estarão em cada cidade?','A relação de participantes de 2027 deve ser confirmada por edição. Logos e fotos de 2026 apresentados no site não confirmam participação em 2027.'],
 ['Já posso reservar a viagem?','Antes de reservar transporte ou hospedagem, confirme endereço, horários e acesso com a organização. Consulte os prestadores de serviço sobre disponibilidade e condições.'],
] as const;
export const exhibitorFaqs = [
 ['Como consulto um estande?','Escolha as cidades de interesse e solicite à equipe informações sobre metragem, estrutura, valores, pagamento e disponibilidade. A consulta não reserva um estande.'],
 ['O que devo solicitar na proposta?','Confirme valor total, condições de pagamento, metragem, itens incluídos, serviços à parte, prazos de formalização e disponibilidade em cada edição.'],
 ['Onde encontro as regras de montagem?','Solicite à organização o manual da edição, endereço e horários de montagem e desmontagem antes de contratar ou planejar a logística.'],
 ['Posso avaliar mais de uma cidade?','Você pode organizar seu interesse em várias cidades no Planejador. Confirme com a equipe as condições e a disponibilidade de cada edição.'],
 ['A participação garante vendas ou pedidos?','Não. A feira aproxima marcas e compradores, mas não garante pedidos, vendas ou faturamento. Os resultados dependem dos produtos, condições e negociações de cada empresa.'],
] as const;
export function downloadText(text: string, filename: string, type = 'text/plain;charset=utf-8') {
 const url = URL.createObjectURL(new Blob([text], {type}));
 const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
 setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
export function saveCalendar(e: Edition) {
 const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SHOWBRINQ//Circuito 2027//PT-BR','BEGIN:VEVENT',`UID:${e.id}-2027@showbrinq-prototype`,`DTSTAMP:20261110T130000Z`,`DTSTART;VALUE=DATE:${e.start}`,`DTEND;VALUE=DATE:${e.end}`,`SUMMARY:SHOWBRINQ 2027 — ${e.city}`,'DESCRIPTION:Datas anunciadas. Confirme endereço e horários com a organização antes de viajar.','END:VEVENT','END:VCALENDAR'].join('\r\n') + '\r\n';
 downloadText(ics, `showbrinq-${e.id}-2027.ics`, 'text/calendar;charset=utf-8');
}
