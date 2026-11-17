export type StandModel = {
  id: `modelo-${1 | 2 | 3 | 4}`;
  name: `Modelo ${1 | 2 | 3 | 4}`;
  image: `/assets/stand-models/modelo-${1 | 2 | 3 | 4}.webp`;
  pdf: `/assets/stand-models/modelo-${1 | 2 | 3 | 4}.pdf`;
  configuration: string;
};

export const standModels: StandModel[] = [
  {
    id: 'modelo-1',
    name: 'Modelo 1',
    image: '/assets/stand-models/modelo-1.webp',
    pdf: '/assets/stand-models/modelo-1.pdf',
    configuration: 'Prateleiras superiores somente no primeiro módulo.',
  },
  {
    id: 'modelo-2',
    name: 'Modelo 2',
    image: '/assets/stand-models/modelo-2.webp',
    pdf: '/assets/stand-models/modelo-2.pdf',
    configuration: 'Prateleiras superiores nos três módulos.',
  },
  {
    id: 'modelo-3',
    name: 'Modelo 3',
    image: '/assets/stand-models/modelo-3.webp',
    pdf: '/assets/stand-models/modelo-3.pdf',
    configuration: 'Prateleiras superiores no primeiro módulo e inferiores.',
  },
  {
    id: 'modelo-4',
    name: 'Modelo 4',
    image: '/assets/stand-models/modelo-4.webp',
    pdf: '/assets/stand-models/modelo-4.pdf',
    configuration: 'Prateleiras superiores e inferiores nos três módulos.',
  },
];
