export type StateIdentity = { flag: string; color: string; light: string; invitation: string };
export const stateIdentity: Record<string, StateIdentity> = {
  MA: {flag:'/assets/flags/ma.png',color:'#d82344',light:'#fff0ec',invitation:'A SHOWBRINQ chega a São Luís.'},
  CE: {flag:'/assets/flags/ce.svg',color:'#078957',light:'#e6f8ee',invitation:'Fortaleza recebe o setor de brinquedos.'},
  PE: {flag:'/assets/flags/pe.svg',color:'#225bd1',light:'#edf2ff',invitation:'Nosso encontro em Caruaru.'},
  BA: {flag:'/assets/flags/ba.svg',color:'#b9193d',light:'#ffedf1',invitation:'Feira de Santana no circuito de 2027.'},
  GO: {flag:'/assets/flags/go.svg',color:'#448926',light:'#eff9e4',invitation:'Goiânia é ponto de encontro.'},
  SP: {flag:'/assets/flags/sp.svg',color:'#4d4a89',light:'#f2efff',invitation:'O circuito passa por Piracicaba.'},
};
