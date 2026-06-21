import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const pages = [
  {
    name: 'pt',
    htmlPath: resolve(repoRoot, 'dist/sobre-nos/index.html'),
    requiredSnippets: [
      'Sobre o CAPA — Clube de Adoção e Proteção Animal',
      'https://capapvl.org/sobre-nos',
      'data-playful-scroll-reveal',
      'IntersectionObserver',
      '/images/sobre-nos/hero-playful-about.webp',
      '/images/sobre-nos/hero-playful-about-fallback.jpg',
      'Fundados em 2001',
      'Sobre o',
      'CAPA',
      'Clube de Adoção e Proteção Animal',
      'uma associação de voluntários dedicados a combater o abandono e os maus tratos animais',
      'Tudo o que fazemos é sustentado pelo trabalho voluntário',
      'Cuidado diário, reabilitação e novas famílias',
      'Cada gesto aproxima um patudo de uma vida segura.',
      'Conheça o seu novo melhor Amigo',
      'Marque uma Visita',
      'Os Nossos Princípios',
      'Três pilares que guiam cada decisão e cada cuidado que prestamos.',
      'Respeito e Proteção',
      'Promovemos o respeito e a proteção dos animais',
      'Voluntariado e Solidariedade',
      'Contamos com a ajuda de voluntários',
      'Adoção Responsável',
      'Incentivamos a adoção responsável',
      'O Nosso Impacto',
      'Esterilizados',
      'Adotados',
      'No Abrigo',
      'Na Comunidade',
      'Parceria com Escolas',
      'O CAPA tem o prazer de trabalhar em parceria com escolas',
      'Juntos, podemos construir um mundo melhor para nossos fiéis companheiros.',
      'Resgate e Reabilitação',
      'Uma Segunda Chance na Vida',
      'O nosso trabalho inclui o resgate de cães',
      'Os nossos Voluntários trabalham incansavelmente',
      'Através dessa dedicação, procuramos dar a estes animais',
      'Triagem',
      'Avaliação veterinária à chegada',
      'Reabilitação',
      'Física e comportamental',
      'Adoção',
      'Encaminhamento para lar',
      'Histórias de Sucesso',
      'Cada Rabo a Abanar é uma Vitória',
      'Zeus — adotado com sucesso',
      'Estamos orgulhosos das nossas histórias de sucesso de Patudos',
      '/caes',
      'mailto:capa.geralpvl@gmail.com',
    ],
    forbiddenSnippets: [
      'Página Não Encontrada',
      'Página não encontrada',
      'https://capapvl.pt/sobre-nos',
      'noindex',
    ],
  },
  {
    name: 'en',
    htmlPath: resolve(repoRoot, 'dist/en/about/index.html'),
    requiredSnippets: [
      'About CAPA — Animal Adoption and Protection Club',
      'https://capapvl.org/en/about',
      'data-playful-scroll-reveal',
      'IntersectionObserver',
      '/images/sobre-nos/hero-playful-about.webp',
      '/images/sobre-nos/hero-playful-about-fallback.jpg',
      'Founded in 2001',
      'About',
      'CAPA',
      'Clube de Adoção e Proteção Animal',
      'Animal Adoption and Protection Club',
      'a volunteer-run association dedicated to fighting animal abandonment and abuse',
      'Everything we do is sustained by volunteer work',
      'Daily care, rehabilitation, and new families',
      'Every gesture brings a dog closer to a safe life.',
      'Meet Your New Best Friend',
      'Book a Visit',
      'Our Principles',
      'Three pillars that guide every decision and every act of care we provide.',
      'Respect and Protection',
      'We promote respect for and protection of animals',
      'Volunteering and Solidarity',
      'We rely on the help of volunteers',
      'Responsible Adoption',
      'We encourage responsible adoption',
      'CAPA by the numbers',
      'Our Impact',
      'Sterilized',
      'Adopted',
      'In Shelter',
      'In the Community',
      'Partnership with Schools',
      'CAPA is proud to work in partnership with schools',
      'Together, we can build a better world for our faithful companions.',
      'Rescue and Rehabilitation',
      'A Second Chance at Life',
      'Our work includes rescuing dogs',
      'Our volunteers work tirelessly',
      'Through this dedication, we seek to give these animals',
      'Triage',
      'Veterinary assessment on arrival',
      'Rehabilitation',
      'Physical and behavioural',
      'Adoption',
      'Placement in a loving home',
      'Success Stories',
      'Every Wagging Tail Is a Victory',
      'Zeus — successfully adopted',
      'We are proud of our success stories of dogs',
      '/en/dogs',
      'mailto:capa.geralpvl@gmail.com',
    ],
    forbiddenSnippets: [
      'Page Not Found',
      'Página Não Encontrada',
      'https://capapvl.pt/en/about',
      'noindex',
    ],
  },
];

const results = pages.map((page) => {
  const html = readFileSync(page.htmlPath, 'utf8');
  const missing = page.requiredSnippets.filter((snippet) => !html.includes(snippet));
  if (missing.length) {
    console.error(`Missing ${missing.length} required snippet(s) in ${page.name} page ${page.htmlPath}:`);
    missing.forEach((snippet) => console.error(`- ${snippet}`));
    process.exit(1);
  }

  const forbiddenPresent = page.forbiddenSnippets.filter((snippet) => html.includes(snippet));
  if (forbiddenPresent.length) {
    console.error(`Forbidden snippet(s) present in ${page.name} page ${page.htmlPath}:`);
    forbiddenPresent.forEach((snippet) => console.error(`- ${snippet}`));
    process.exit(1);
  }

  return {
    page: page.name,
    checked: page.requiredSnippets.length,
    htmlPath: page.htmlPath,
  };
});

console.log(JSON.stringify({ ok: true, pages: results }, null, 2));
