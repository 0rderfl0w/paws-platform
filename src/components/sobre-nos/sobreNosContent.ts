import type { Locale } from '../../i18n';

type Principle = {
  title: string;
  description: string;
  icon: string;
  tone: string;
};

type QuickStat = {
  value: string;
  label: string;
};

type AboutContent = {
  locale: Locale;
  hero: {
    badge: string;
    headingPrefix: string;
    headingHighlight: string;
    leadStrong: string;
    leadRest: string;
    subtext: string;
    imageAlt: string;
    captionTitle: string;
    captionText: string;
    primaryCta: string;
    secondaryCta: string;
    primaryHref: string;
    secondaryHref: string;
    chips: string[];
  };
  principles: {
    heading: string;
    subheading: string;
    cards: Principle[];
  };
  community: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
    cta: string;
    imageAlt: string;
    supportAlt: string;
  };
  rescue: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
    quickStats: QuickStat[];
    imageAlts: string[];
  };
  story: {
    eyebrow: string;
    heading: string;
    imageAlt: string;
    caption: string;
    quote: string;
    cta: string;
    ctaHref: string;
  };
};

export const aboutContent: Record<Locale, AboutContent> = {
  pt: {
    locale: 'pt',
    hero: {
      badge: 'Fundados em 2001',
      headingPrefix: 'Sobre o',
      headingHighlight: 'CAPA',
      leadStrong: 'Clube de Adoção e Proteção Animal',
      leadRest: '— uma associação de voluntários dedicados a combater o abandono e os maus tratos animais, recolhendo, tratando e encaminhando-os para adoção.',
      subtext: 'Tudo o que fazemos é sustentado pelo trabalho voluntário e pela generosidade da nossa comunidade.',
      imageAlt: 'Cão acolhido pelo CAPA a receber carinho de voluntários',
      captionTitle: 'Cuidado diário, reabilitação e novas famílias',
      captionText: 'Cada gesto aproxima um patudo de uma vida segura.',
      primaryCta: 'Conheça o seu novo melhor Amigo',
      secondaryCta: 'Marque uma Visita',
      primaryHref: '/caes',
      secondaryHref: 'mailto:capa.geralpvl@gmail.com',
      chips: ['Voluntariado e Solidariedade', 'Adoção Responsável', 'Resgate e Reabilitação'],
    },
    principles: {
      heading: 'Os Nossos Princípios',
      subheading: 'Três pilares que guiam cada decisão e cada cuidado que prestamos.',
      cards: [
        {
          title: 'Respeito e Proteção',
          description: 'Promovemos o respeito e a proteção dos animais, garantindo-lhes uma vida digna e livre de maus tratos.',
          icon: '🛡️',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Voluntariado e Solidariedade',
          description: 'Contamos com a ajuda de voluntários e com a solidariedade da comunidade para cuidar dos nossos patudos e garantir-lhes uma vida melhor.',
          icon: '❤',
          tone: 'bg-playful-peach/75 sm:rotate-1 sm:translate-y-5',
        },
        {
          title: 'Adoção Responsável',
          description: 'Incentivamos a adoção responsável, garantindo que os animais são acolhidos por famílias comprometidas com o seu bem-estar.',
          icon: '🏠',
          tone: 'bg-white sm:-rotate-1',
        },
      ],
    },
    community: {
      eyebrow: 'Na Comunidade',
      heading: 'Parceria com Escolas',
      paragraphs: [
        'O CAPA tem o prazer de trabalhar em parceria com escolas, promovendo o cuidado e bem-estar animal. Selecionamos alguns dos nossos cães mais sociáveis e levamos alegria aos corações de crianças e jovens ao apresentar o nosso trabalho, criando laços de empatia e compreensão com experiências enriquecedoras.',
        'Juntos, podemos construir um mundo melhor para nossos fiéis companheiros.',
      ],
      cta: 'Marque uma Visita',
      imageAlt: 'Cão do CAPA descontraído durante atividades com voluntários',
      supportAlt: 'Cão do CAPA junto a uma vedação do abrigo',
    },
    rescue: {
      eyebrow: 'Resgate e Reabilitação',
      heading: 'Uma Segunda Chance na Vida',
      paragraphs: [
        'O nosso trabalho inclui o resgate de cães de situações perigosas e de negligência. Ao chegarem ao abrigo, estes patudos recebem cuidados veterinários dedicados e passam por reabilitação física e socialização.',
        'Os nossos Voluntários trabalham incansavelmente para restaurar a sua saúde e a sua confiança no ser humano, proporcionando-lhes uma segunda chance na vida.',
        'Através dessa dedicação, procuramos dar a estes animais a oportunidade de encontrar um lar amoroso e seguro, onde possam viver felizes e saudáveis.',
      ],
      quickStats: [
        { value: 'Triagem', label: 'Avaliação veterinária à chegada' },
        { value: 'Reabilitação', label: 'Física e comportamental' },
        { value: 'Adoção', label: 'Encaminhamento para lar' },
      ],
      imageAlts: [
        'Cão resgatado a recuperar no abrigo do CAPA',
        'Cão em recuperação veterinária no CAPA',
        'Cães acolhidos pelo CAPA a descansar no abrigo',
      ],
    },
    story: {
      eyebrow: 'Histórias de Sucesso',
      heading: 'Cada Rabo a Abanar é uma Vitória',
      imageAlt: 'Zeus, um dos nossos cães de sucesso adoptado pelo CAPA PVL',
      caption: 'Zeus — adotado com sucesso 🐾',
      quote: '"Estamos orgulhosos das nossas histórias de sucesso de Patudos que encontraram lares responsáveis e cheios de amor através da adoção. Cada rabo a abanar e olhar cheio de gratidão é uma prova do poder transformador do amor."',
      cta: 'Conheça o seu novo melhor Amigo',
      ctaHref: '/caes',
    },
  },
  en: {
    locale: 'en',
    hero: {
      badge: 'Founded in 2001',
      headingPrefix: 'About',
      headingHighlight: 'CAPA',
      leadStrong: 'Clube de Adoção e Proteção Animal',
      leadRest: '(Animal Adoption and Protection Club) — a volunteer-run association dedicated to fighting animal abandonment and abuse by rescuing, treating, and rehoming dogs.',
      subtext: 'Everything we do is sustained by volunteer work and the generosity of our community.',
      imageAlt: 'Dog sheltered by CAPA receiving care from volunteers',
      captionTitle: 'Daily care, rehabilitation, and new families',
      captionText: 'Every gesture brings a dog closer to a safe life.',
      primaryCta: 'Meet Your New Best Friend',
      secondaryCta: 'Book a Visit',
      primaryHref: '/en/dogs',
      secondaryHref: 'mailto:capa.geralpvl@gmail.com',
      chips: ['Volunteering and Solidarity', 'Responsible Adoption', 'Rescue and Rehabilitation'],
    },
    principles: {
      heading: 'Our Principles',
      subheading: 'Three pillars that guide every decision and every act of care we provide.',
      cards: [
        {
          title: 'Respect and Protection',
          description: 'We promote respect for and protection of animals, ensuring them a dignified life free from abuse.',
          icon: '🛡️',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Volunteering and Solidarity',
          description: 'We rely on the help of volunteers and the solidarity of the community to care for our dogs and give them a better life.',
          icon: '❤',
          tone: 'bg-playful-peach/75 sm:rotate-1 sm:translate-y-5',
        },
        {
          title: 'Responsible Adoption',
          description: 'We encourage responsible adoption, ensuring animals are welcomed by families committed to their wellbeing.',
          icon: '🏠',
          tone: 'bg-white sm:-rotate-1',
        },
      ],
    },
    community: {
      eyebrow: 'In the Community',
      heading: 'Partnership with Schools',
      paragraphs: [
        'CAPA is proud to work in partnership with schools, promoting animal care and welfare. We select some of our most sociable dogs and bring joy to the hearts of children and young people by presenting our work, building bonds of empathy and understanding through enriching experiences.',
        'Together, we can build a better world for our faithful companions.',
      ],
      cta: 'Book a Visit',
      imageAlt: 'CAPA dog relaxing during volunteer activities',
      supportAlt: 'CAPA dog near a shelter fence',
    },
    rescue: {
      eyebrow: 'Rescue and Rehabilitation',
      heading: 'A Second Chance at Life',
      paragraphs: [
        'Our work includes rescuing dogs from dangerous situations and neglect. Upon arriving at the shelter, these dogs receive dedicated veterinary care and undergo physical rehabilitation and socialisation.',
        'Our volunteers work tirelessly to restore their health and their trust in people, giving them a second chance at life.',
        'Through this dedication, we seek to give these animals the opportunity to find a loving and safe home where they can live happily and healthily.',
      ],
      quickStats: [
        { value: 'Triage', label: 'Veterinary assessment on arrival' },
        { value: 'Rehabilitation', label: 'Physical and behavioural' },
        { value: 'Adoption', label: 'Placement in a loving home' },
      ],
      imageAlts: [
        'Rescued dog recovering at the CAPA shelter',
        'Dog receiving veterinary care at CAPA',
        'Dogs sheltered by CAPA resting at the shelter',
      ],
    },
    story: {
      eyebrow: 'Success Stories',
      heading: 'Every Wagging Tail Is a Victory',
      imageAlt: 'Zeus, one of our success stories, adopted through CAPA PVL',
      caption: 'Zeus — successfully adopted 🐾',
      quote: '"We are proud of our success stories of dogs who found responsible and loving homes through adoption. Every wagging tail and grateful gaze is proof of the transformative power of love."',
      cta: 'Meet Your New Best Friend',
      ctaHref: '/en/dogs',
    },
  },
};

export type { AboutContent };
