export type BuyerClip = {src:string;poster:string;title:string;description:string};
export type BuyerVisual = {revision:number;heroPhoto:string;heroAlt:string;title:string;intro:string;clips:BuyerClip[]};
export const buyerVisualDefault:BuyerVisual={revision:0,heroPhoto:'/assets/editorial/lojistas-plaspolo.jpg',heroAlt:'Visitantes conversam com fornecedores no estande Plaspolo em edição anterior',title:'O valor do encontro, contado por quem participa.',intro:'Além de conhecer produtos, participar da feira pode render conversas entre diferentes profissionais do setor.',clips:[
 {src:'/assets/real-stories/relato-visitante.mp4',poster:'/assets/real-stories/relato-visitante.jpg',title:'Uma participante conta sua experiência.',description:'Uma profissional de transporte fala sobre o contato com fornecedores e clientes durante a feira.'},
 {src:'/assets/exhibitor-stories/multimix-legendado.mp4',poster:'/assets/exhibitor-stories/multimix-legendado.jpg',title:'A feira pelo olhar de um fornecedor · Multimix.',description:'Registro de edição anterior: a experiência de participar ao longo dos anos.'},
 {src:'/assets/exhibitor-stories/bambi-caruaru.mp4',poster:'/assets/exhibitor-stories/bambi-caruaru.jpg',title:'Uma primeira participação · Bambi.',description:'Um fornecedor relata sua primeira participação em Caruaru, em edição anterior.'},
 {src:'/assets/real-stories/relato-expositor-adicional.mp4',poster:'/assets/real-stories/relato-expositor-adicional.jpg',title:'Um expositor fala sobre a feira.',description:'Registro enviado pela organização, gravado em edição anterior da Showbrinq.'},
]};
export const buyerVideoLibrary=buyerVisualDefault.clips;
