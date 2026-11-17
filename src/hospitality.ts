import { editions, type Edition } from './data';

export type HospitalityCity = Pick<Edition, 'id' | 'city' | 'uf'>;

export type HotelPhone = {
  label: string;
  href: string;
};

export type PartnerHotel = {
  id: string;
  name: string;
  cityId: Edition['id'];
  city: string;
  uf: string;
  address: string;
  addressNote?: string;
  phones: HotelPhone[];
  email?: string;
  flyer: string;
};

export const hospitalityCities: HospitalityCity[] = editions.map(({ id, city, uf }) => ({ id, city, uf }));

// Contatos transcritos do guia de hotéis SHOWBRINQ 2026. Não representam condições confirmadas para 2027.
export const hotelPartners: PartnerHotel[] = [
  {
    id: 'wa-hotel-caruaru',
    name: 'WA Hotel',
    cityId: 'caruaru',
    city: 'Caruaru',
    uf: 'PE',
    address: 'Av. Adjar da Silva Casé, 800, Indianópolis, Caruaru – PE',
    phones: [{ label: '(81) 3725-1646', href: 'tel:+558137251646' }],
    flyer: '/assets/hotels/wa-hotel-caruaru.png',
  },
  {
    id: 'nh-hotel-feira-de-santana',
    name: 'NH Hotel',
    cityId: 'feira-de-santana',
    city: 'Feira de Santana',
    uf: 'BA',
    address: 'Av. João Durval Carneiro, Feira de Santana – BA, CEP 44051-335',
    addressNote: 'O guia não informa número para este endereço.',
    phones: [{ label: '(75) 3011-5800', href: 'tel:+557530115800' }],
    email: 'reservas.hfds@nhhotels.com',
    flyer: '/assets/hotels/nh-hotel-feira-de-santana.png',
  },
  {
    id: 'belaris-comfort-hotel-sao-luis',
    name: 'Belaris Comfort & Hotel',
    cityId: 'sao-luis',
    city: 'São Luís',
    uf: 'MA',
    address: 'R. Buriti Bravo, 16, Quintas do Calhau, São Luís – MA, CEP 65072-025',
    phones: [{ label: '(98) 3302-6661', href: 'tel:+559833026661' }],
    email: 'reservas@belarishotel.com.br',
    flyer: '/assets/hotels/belaris-comfort-hotel-sao-luis.png',
  },
  {
    id: 'profissionalle-hotel-sao-luis',
    name: 'Profissionalle Hotel',
    cityId: 'sao-luis',
    city: 'São Luís',
    uf: 'MA',
    address: 'Av. Coronel Colares Moreira, 13, Renascença II, São Luís – MA, CEP 65075-440',
    phones: [{ label: '(21) 99692-0550', href: 'tel:+5521996920550' }],
    flyer: '/assets/hotels/profissionalle-hotel-sao-luis.png',
  },
  {
    id: 'comfort-hotel-goiania',
    name: 'Comfort Hotel Goiânia',
    cityId: 'goiania',
    city: 'Goiânia',
    uf: 'GO',
    address: 'Av. Dr. Ismerino Soares de Carvalho, 52, Setor Aeroporto, Goiânia – GO, CEP 74075-040',
    phones: [{ label: '(62) 3604-8484', href: 'tel:+556236048484' }],
    email: 'eventos.chgo@ahi.com.br',
    flyer: '/assets/hotels/comfort-hotel-goiania.png',
  },
  {
    id: 'gran-mareiro-hotel-fortaleza',
    name: 'Gran Mareiro Hotel',
    cityId: 'fortaleza',
    city: 'Fortaleza',
    uf: 'CE',
    address: 'Rua Oswaldo Araújo, 100, Praia do Futuro, Fortaleza – CE, CEP 60177-325',
    phones: [{ label: '(85) 3266-7222', href: 'tel:+558532667222' }],
    flyer: '/assets/hotels/gran-mareiro-hotel-fortaleza.png',
  },
  {
    id: 'bristol-jangada-hotel-fortaleza',
    name: 'Bristol Jangada Hotel',
    cityId: 'fortaleza',
    city: 'Fortaleza',
    uf: 'CE',
    address: 'Av. da Abolição, 3035, Meireles, Fortaleza – CE, CEP 60165-081',
    phones: [
      { label: '(85) 3035-0017', href: 'tel:+558530350017' },
      { label: '(85) 3035-0018', href: 'tel:+558530350018' },
    ],
    email: 'reservas.guararapes@bristolhoteis.com.br',
    flyer: '/assets/hotels/bristol-jangada-hotel-fortaleza.png',
  },
];

export function normalizeHospitalityText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function cityKey(value: string): string {
  return normalizeHospitalityText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function resolveHospitalityCity(value?: string | null): HospitalityCity | undefined {
  if (!value?.trim()) return undefined;
  const key = cityKey(value);
  return hospitalityCities.find((city) => cityKey(city.id) === key || cityKey(city.city) === key);
}
