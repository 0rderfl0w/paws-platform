import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const htmlPath = process.argv[2] ? resolve(process.argv[2]) : resolve(repoRoot, 'dist/ajudar/index.html');
const html = readFileSync(htmlPath, 'utf8');

const requiredSnippets = [
  'Como Ajudar — CAPA Póvoa de Lanhoso',
  'https://capapvl.org/ajudar',
  'data-playful-scroll-reveal',
  'IntersectionObserver',
  '/images/ajudar/hero-playful-help.webp',
  '/images/ajudar/hero-playful-help-fallback.jpg',
  'Faça a Diferença',
  'Apoie o',
  'CAPA PVL!',
  'Cada gesto conta. Seja com o seu tempo, com materiais ou com uma contribuição financeira,',
  'a sua ajuda transforma a vida de centenas de animais todos os anos.',
  'Descubra como pode contribuir para o nosso trabalho e juntar-se à nossa comunidade de defensores animais.',
  'Materiais de Limpeza',
  'Detergente multiusos',
  'Lixívia',
  'Sacos do lixo (grandes)',
  'Papel absorvente',
  'Luvas descartáveis',
  'Comida para Cão',
  'Ração seca (adulto e júnior)',
  'Comida húmida em lata',
  'Snacks e petiscos',
  'Ração para cachorros',
  'Suplementos vitamínicos',
  'Medicação',
  'Antiparasitários externos',
  'Desparasitantes internos',
  'Pensos e ligaduras',
  'Soro fisiológico',
  'Consultar lista atual',
  'Outros Artigos',
  'Coleiras e trelas',
  'Cobertores e almofadas',
  'Brinquedos e ossos',
  'Caixas de transporte',
  'Material de escritório',
  'capa.geralpvl@gmail.com',
  'Ofereça o Seu Tempo',
  'O voluntariado é a espinha dorsal do CAPA. Há muitas formas de ajudar, independentemente da sua disponibilidade.',
  'Passear os Cães',
  'Leve um dos nossos patudos para uma caminhada revigorante. É simples, faz bem a si e a eles.',
  'Fotografar Animais',
  'Boas fotos aumentam muito as hipóteses de adoção. Se tem jeito para a fotografia, precisamos de si!',
  'Voluntariado no Abrigo',
  'Ajude nos cuidados diários, limpeza e socialização dos animais diretamente no nosso espaço.',
  'Campanhas e Divulgação',
  'Ajude a organizar eventos, feiras de adoção e a divulgar os nossos animais nas redes sociais.',
  'Famílias de Acolhimento Temporário',
  'Abra a Sua Casa Temporariamente',
  'O que é uma Família de Acolhimento Temporário (FAT)?',
  'Uma FAT é uma família que acolhe temporariamente um dos nossos mais de',
  'O acolhimento temporário é especialmente importante para animais mais ansiosos, cachorros, ou aqueles',
  'O CAPA fornece toda a alimentação, medicação e suporte veterinário necessário. A família apenas',
  'Quero ser Família de Acolhimento',
  'Apoio Financeiro',
  'Doações Financeiras',
  'As doações financeiras permitem-nos pagar cirurgias, tratamentos veterinários e as despesas correntes do abrigo.',
  'Transferência Bancária',
  'PT50 0010 0000 4591 4000 0014 9',
  'Clube de Adoção e Proteção Animal de Póvoa de Lanhoso',
  'MB Way',
  'Contacte-nos por email para obter o número de telefone para pagamento via MB Way.',
  'PayPal',
  'Aceitamos doações via PayPal. Contacte-nos para obter o link de pagamento direto.',
  'Para qualquer dúvida sobre pagamentos, contacte-nos em',
  'Cada Gesto Conta',
  'Por detrás de cada animal que adotamos, tratamos e resgatamos, há pessoas como você que acreditam',
  'que um mundo mais justo para os animais é possível.',
  'Não precisa de fazer muito. Basta fazer alguma coisa.',
  'Fale Connosco',
];

const missing = requiredSnippets.filter((snippet) => !html.includes(snippet));
if (missing.length) {
  console.error(`Missing ${missing.length} required snippet(s) in ${htmlPath}:`);
  missing.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

const forbiddenSnippets = [
  'Página Não Encontrada',
  'Página não encontrada',
  'https://capapvl.pt/ajudar',
];
const forbiddenPresent = forbiddenSnippets.filter((snippet) => html.includes(snippet));
if (forbiddenPresent.length) {
  console.error(`Forbidden snippet(s) present in ${htmlPath}:`);
  forbiddenPresent.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked: requiredSnippets.length, htmlPath }, null, 2));
