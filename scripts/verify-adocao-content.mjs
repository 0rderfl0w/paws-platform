#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const pages = [
  {
    name: 'pt',
    htmlPath: resolve(repoRoot, 'dist/adocao/index.html'),
    requiredSnippets: [
      'Adoção — CAPA Póvoa de Lanhoso',
      'https://capapvl.org/adocao',
      'data-playful-scroll-reveal',
      'IntersectionObserver',
      '/images/adocao/hero-playful-adoption.webp',
      '/images/adocao/hero-playful-adoption-fallback.jpg',
      'Adoção Responsável',
      'Ganhe um Novo',
      'Melhor Amigo!',
      'A adoção é um ato de amor que transforma duas vidas: a do animal e a sua.',
      'Estes patudos estão à espera de uma segunda chance',
      'Quando adopta, não está apenas a ganhar um amigo',
      'está a salvar uma vida.',
      'Ver Cães Disponíveis',
      'Como funciona a adoção',
      'Benefícios da Adoção',
      'Adotar um cão de um abrigo é uma decisão que traz alegria',
      'Uma Escolha que Muda Vidas',
      'Ao adotar, está a dar uma segunda oportunidade',
      'Bem-Estar Melhorado',
      'A sensação de ser salvo cria um vínculo único',
      'Comunidade Global',
      'Decisão Financeira Inteligente',
      'Compatibilidade Real',
      'Educação pelo Exemplo',
      'É uma lição viva que durarà para toda a vida.',
      'O Processo de Adoção',
      'O nosso processo de adoção foi pensado',
      'Escolha o SeuHorário',
      'Contacte-nos por email ou telefone para agendar uma visita ao abrigo.',
      'Traga o Seu Cão',
      'Se já tem um cão em casa, traga-o consigo!',
      'Conheça e Conecte-se',
      'Passe tempo com os animais.',
      'Reflita com Calma',
      'Não há pressa.',
      'Prepare os Documentos',
      'comprovativo de morada e documento de identificação.',
      'Venha Buscar o Seu Cão',
      'Celebrate! O seu novo melhor amigo está à sua espera.',
      'Histórico Veterinário completo',
      'Quanto Custa Adotar',
      'As taxas de adoção incluem todos os cuidados veterinários.',
      'Fêmea',
      '75€',
      'Macho',
      '65€',
      'Bebé',
      '30€',
      'Vacinas em dia',
      'Esterilização',
      'Microchip',
      '* Esterilização obrigatória aos 6 meses',
      'incluída gratuitamente',
      'Para mais informações, contacte-nos em',
      'capa.geralpvl@gmail.com',
      'Encontre o Seu Companheiro',
      'Cada um dos nossos patudos tem uma história única',
      'Venha conhecer os animais que estão prontos',
      'href="/caes"',
    ],
    forbiddenSnippets: [
      'Página Não Encontrada',
      'Página não encontrada',
      'https://capapvl.pt/adocao',
      'name="robots" content="noindex',
    ],
  },
  {
    name: 'en',
    htmlPath: resolve(repoRoot, 'dist/en/adopt/index.html'),
    requiredSnippets: [
      'Adoption — CAPA Póvoa de Lanhoso',
      'https://capapvl.org/en/adopt',
      'data-playful-scroll-reveal',
      'IntersectionObserver',
      '/images/adocao/hero-playful-adoption.webp',
      '/images/adocao/hero-playful-adoption-fallback.jpg',
      'Responsible Adoption',
      'Gain a New',
      'Best Friend!',
      "Adoption is an act of love that transforms two lives",
      'These furry friends are waiting for a second chance',
      'When you adopt, you&#39;re not just gaining a companion',
      'you&#39;re saving a life.',
      'See Available Dogs',
      'How adoption works',
      'Benefits of Adoption',
      'Adopting a dog from a shelter is a decision',
      'A Choice That Changes Lives',
      'you&#39;re giving a second chance',
      'Improved Well-Being',
      'The sense of being rescued creates a unique',
      'A Community of Animal Lovers',
      'A Smart Financial Decision',
      'A True Match',
      'Teaching by Example',
      'It&#39;s a living lesson that will last a lifetime.',
      'The Adoption Process',
      'Our adoption process is designed',
      'Book a Visit',
      'Contact us by email or phone to schedule a visit to the shelter.',
      'Bring Your Dog Along',
      'If you already have a dog at home, bring them with you!',
      'Meet and Connect',
      'Spend time with the animals.',
      'Take Your Time',
      'There&#39;s no rush.',
      'Prepare Your Documents',
      'proof of address and a valid ID.',
      'Take Your Dog Home',
      'Celebrate! Your new best friend is waiting for you.',
      'complete Veterinary Record',
      'How Much Does It Cost to Adopt?',
      "Adoption fees cover all veterinary care.",
      'Female',
      '75€',
      'Male',
      '65€',
      'Puppy',
      '30€',
      'Up-to-date vaccinations',
      'Spayed',
      'Neutered',
      'Microchipped',
      '* Spay/neuter required at 6 months',
      'included at no extra cost',
      'For more information, contact us at',
      'capa.geralpvl@gmail.com',
      'Find Your Companion',
      'Each one of our furry friends has a unique story',
      'Come meet the animals who are ready',
      'href="/en/dogs"',
    ],
    forbiddenSnippets: [
      'Page Not Found',
      'Página Não Encontrada',
      'https://capapvl.pt/en/adopt',
      'name="robots" content="noindex',
    ],
  },
];

const results = pages.map((page) => {
  const html = readFileSync(page.htmlPath, 'utf8');
  const missing = page.requiredSnippets.filter((snippet) => !html.includes(snippet));
  if (missing.length) {
    console.error(`Missing ${missing.length} required snippet(s) in ${page.name} page ${page.htmlPath}:`);
    missing.forEach((snippet) => console.error(`- ${snippet}`));
    process.exitCode = 1;
  }

  const forbiddenPresent = page.forbiddenSnippets.filter((snippet) => html.includes(snippet));
  if (forbiddenPresent.length) {
    console.error(`Forbidden ${forbiddenPresent.length} snippet(s) present in ${page.name} page ${page.htmlPath}:`);
    forbiddenPresent.forEach((snippet) => console.error(`- ${snippet}`));
    process.exitCode = 1;
  }

  return {
    page: page.name,
    checked: page.requiredSnippets.length + page.forbiddenSnippets.length,
    htmlPath: page.htmlPath,
  };
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(JSON.stringify({ ok: true, pages: results }, null, 2));
