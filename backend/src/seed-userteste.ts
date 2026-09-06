import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedUserTeste() {
  // Limpa dados do tenant userteste (se existir)
  const EMAIL = 'userteste@restaurante.com'
  const SENHA = '12345678'
  const NOME = 'Barraca da Vânia'

  const existente = await prisma.usuario.findUnique({ where: { email: EMAIL } })
  if (existente) {
    await prisma.movimentoEstoque.deleteMany({ where: { tenantId: existente.id } })
    await prisma.itemComanda.deleteMany({ where: { comanda: { mesa: { tenantId: existente.id } } } })
    await prisma.comanda.deleteMany({ where: { mesa: { tenantId: existente.id } } })
    await prisma.itemCardapio.deleteMany({ where: { tenantId: existente.id } })
    await prisma.categoria.deleteMany({ where: { tenantId: existente.id } })
    await prisma.mesa.deleteMany({ where: { tenantId: existente.id } })
    await prisma.garcom.deleteMany({ where: { tenantId: existente.id } })
    await prisma.refreshToken.deleteMany({ where: { usuarioId: existente.id } })
  }

  const senhaHash = await bcrypt.hash(SENHA, 12)
  const user = await prisma.usuario.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      email: EMAIL,
      nome: NOME,
      senhaHash,
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId: '',
    },
  })
  if (!user.tenantId || user.tenantId === '') {
    await prisma.usuario.update({
      where: { id: user.id },
      data: { tenantId: user.id },
    })
  }
  const tenantId = user.id

  // Garçons
  await prisma.garcom.createMany({
    data: [
      { nome: 'Carlos Silva', tenantId },
      { nome: 'Ana Oliveira', tenantId },
      { nome: 'Pedro Santos', tenantId },
      { nome: 'Marina Costa', tenantId },
      { nome: 'João Paulo', tenantId },
    ],
  })

  // Mesas
  await prisma.mesa.createMany({
    data: Array.from({ length: 15 }, (_, i) => ({ numero: i + 1, tenantId })),
  })

  // Categorias
  const bebidas = await prisma.categoria.create({ data: { nome: 'Bebidas', tenantId } })
  const petPeixe = await prisma.categoria.create({ data: { nome: 'Petiscos de Peixe', tenantId } })
  const petCamarao = await prisma.categoria.create({ data: { nome: 'Petiscos de Camarão', tenantId } })
  const petisco = await prisma.categoria.create({ data: { nome: 'Petiscos', tenantId } })
  const refeicoes = await prisma.categoria.create({ data: { nome: 'Refeições', tenantId } })
  const opcionais = await prisma.categoria.create({ data: { nome: 'Porções Opcionais', tenantId } })
  const caldos = await prisma.categoria.create({ data: { nome: 'Caldos', tenantId } })
  const pastel = await prisma.categoria.create({ data: { nome: 'Pastel', tenantId } })

  await prisma.itemCardapio.createMany({
    data: [
      // === BEBIDAS ===
      { nome: 'Cerveja garrafa 600ml', nomeEn: 'Beer bottle 600 ml', preco: 12, categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Malte', nomeEn: 'Beer bottle 600ml Malt', preco: 12, categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja Devassa 600ml', nomeEn: 'Beer Devassa', preco: 16, categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Original', nomeEn: 'Beer bottle Original 600ml', preco: 18, categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Budweiser', nomeEn: 'Beer bottle Budweiser 600ml', preco: 17, categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Stella Artois', nomeEn: 'Beer bottle Stella Artois 600ml', preco: 18, categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Heineken', nomeEn: 'Beer bottle Heineken 600ml', preco: 18, categoriaId: bebidas.id, tenantId },
      { nome: 'Refrigerante lata', nomeEn: 'Soda can', preco: 6, categoriaId: bebidas.id, tenantId },
      { nome: 'Refrigerante 1 litro', nomeEn: 'Refrigerant 1 liter', preco: 12, categoriaId: bebidas.id, tenantId },
      { nome: 'Água de coco', nomeEn: 'Coconut water', preco: 6, categoriaId: bebidas.id, tenantId },
      { nome: 'Água mineral', nomeEn: 'Mineral water', preco: 4, categoriaId: bebidas.id, tenantId },
      { nome: 'Água mineral com gás', nomeEn: 'Carbonated mineral water', preco: 5, categoriaId: bebidas.id, tenantId },
      { nome: 'Suco copo 400ml', nomeEn: 'Juice cup', preco: 8, categoriaId: bebidas.id, tenantId },
      { nome: 'Suco jarra 1L', nomeEn: 'Juice jar', preco: 25, categoriaId: bebidas.id, tenantId },
      { nome: 'Hula-Hula', nomeEn: 'Hula-hula', preco: 25, categoriaId: bebidas.id, tenantId },
      { nome: 'Caipirinha', nomeEn: 'Caipirinha', preco: 13, categoriaId: bebidas.id, tenantId },
      { nome: 'Caipirosca', nomeEn: 'Caipirosca', preco: 15, categoriaId: bebidas.id, tenantId },
      { nome: 'Caipifrutas', nomeEn: 'Caipifrutas', preco: 17, categoriaId: bebidas.id, tenantId },
      { nome: 'Red Bull', nomeEn: 'Red Bull', preco: 14, categoriaId: bebidas.id, tenantId },
      { nome: 'Pinga', nomeEn: 'BarPinga', preco: 3, categoriaId: bebidas.id, tenantId },
      { nome: 'Ypioca', nomeEn: 'Ypioca', preco: 4, categoriaId: bebidas.id, tenantId },
      { nome: 'Conhaque', nomeEn: 'Cognac/Brandy', preco: 7, categoriaId: bebidas.id, tenantId },
      { nome: 'Montilla', nomeEn: 'Montilla', preco: 10, categoriaId: bebidas.id, tenantId },
      { nome: 'Vodka Smirnoff', nomeEn: 'Vodka Smirnoff', preco: 10, categoriaId: bebidas.id, tenantId },
      { nome: 'Campari', nomeEn: 'Campari', preco: 8, categoriaId: bebidas.id, tenantId },
      { nome: 'Whisky', nomeEn: 'Whisky', preco: 14, categoriaId: bebidas.id, tenantId },

      // === PETISCOS DE PEIXE ===
      { nome: 'Peixe frito P (Posta)', nomeEn: 'Small Fried Fish - Steak', preco: 95, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Peixe frito M (Posta)', nomeEn: 'Medium Fried Fish - Steak', preco: 100, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Peixe frito P (Inteiro)', nomeEn: 'Small Fried Fish - Whole', preco: 105, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Peixe frito M (Inteiro)', nomeEn: 'Medium Fried Fish - Whole', preco: 110, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Peixe frito G (Posta)', nomeEn: 'Large Fried Fish - Steak', preco: 115, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Peixe frito G (Inteiro)', nomeEn: 'Large Fried Fish - Whole', preco: 125, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Isca de peixe', nomeEn: 'Fish bait', preco: 100, categoriaId: petPeixe.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },

      // === PETISCOS DE CAMARÃO ===
      { nome: 'Camarão à milanesa', nomeEn: 'Milanese Shrimp', preco: 105, categoriaId: petCamarao.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Camarão alho e óleo', nomeEn: 'Shrimp garlic and oil', preco: 95, categoriaId: petCamarao.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Camarão ao bafo', nomeEn: 'Shrimp in the breath', preco: 105, categoriaId: petCamarao.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Camarão descascado', nomeEn: 'Peeled Shrimp', preco: 115, categoriaId: petCamarao.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Lagosta', nomeEn: 'Lobster', preco: 135, categoriaId: petCamarao.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },

      // === PETISCOS ===
      { nome: 'Carne de sol', nomeEn: 'Sun dried meat', preco: 95, categoriaId: petisco.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Frango à passarinho', nomeEn: 'Chicken with the little bird', preco: 85, categoriaId: petisco.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Frango à milanesa', nomeEn: 'Breaded chicken', preco: 95, categoriaId: petisco.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Paçoca de carne sol', nomeEn: 'Meat lover of sunshine', preco: 95, categoriaId: petisco.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },
      { nome: 'Filé com fritas', nomeEn: 'Steak and fries', preco: 95, categoriaId: petisco.id, observacao: 'Acompanha Batata ou Macaxeira', tenantId },

      // === REFEIÇÕES ===
      { nome: 'Peixe frito (posta)', nomeEn: 'Fried fish - fish post', preco: 120, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe frito (posta)', nomeEn: 'Fried fish - fish post', preco: 150, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe frito (inteiro)', nomeEn: 'Whole fried fish', preco: 140, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe frito (inteiro)', nomeEn: 'Whole fried fish', preco: 170, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe ao molho de camarão (posta)', nomeEn: 'Fish steak with shrimp sauce', preco: 150, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe ao molho de camarão (posta)', nomeEn: 'Fish steak with shrimp sauce', preco: 180, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe ao molho de camarão (inteiro)', nomeEn: 'Fish in shrimp sauce - whole', preco: 170, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixe ao molho de camarão (inteiro)', nomeEn: 'Fish in shrimp sauce - whole', preco: 200, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Isca de peixe', nomeEn: 'Fish bait', preco: 130, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Isca de peixe', nomeEn: 'Fish bait', preco: 160, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Carne de sol', nomeEn: 'Sun dried meat', preco: 130, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Carne de sol', nomeEn: 'Sun dried meat', preco: 160, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão alho e óleo', nomeEn: 'Garlic and oil shrimp', preco: 125, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão alho e óleo', nomeEn: 'Garlic and oil shrimp', preco: 155, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão à milanesa', nomeEn: 'Milanese Shrimp', preco: 135, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão à milanesa', nomeEn: 'Milanese Shrimp', preco: 165, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão descascado', nomeEn: 'Peeled shrimp', preco: 150, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão descascado', nomeEn: 'Peeled shrimp', preco: 180, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão ensopado', nomeEn: 'Stewed shrimp', preco: 130, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Camarão ensopado', nomeEn: 'Stewed shrimp', preco: 160, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Paçoca de carne de sol', nomeEn: 'Beef stew', preco: 130, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Paçoca de carne de sol', nomeEn: 'Beef stew', preco: 160, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Frango à passarinho', nomeEn: 'Chicken with the little bird', preco: 110, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Frango à passarinho', nomeEn: 'Chicken with the little bird', preco: 140, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Mistão', nomeEn: 'Mixed Platter - Serves 4 people', preco: 260, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Serve 4 pessoas (peixe, carne de sol e camarão)', tenantId },
      { nome: 'Peixada', nomeEn: 'Fish', preco: 140, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Peixada', nomeEn: 'Fish', preco: 170, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Galinha Caipira', nomeEn: 'Free-range chicken', preco: 120, porcaoTamanho: 'Para 2 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Galinha Caipira', nomeEn: 'Free-range chicken', preco: 150, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },
      { nome: 'Lagosta', nomeEn: 'Lobster', preco: 190, porcaoTamanho: 'Para 4 pessoas', categoriaId: refeicoes.id, observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', tenantId },

      // === PORÇÕES OPCIONAIS ===
      { nome: 'Arroz', nomeEn: 'Rice', preco: 20, categoriaId: opcionais.id, tenantId },
      { nome: 'Feijão', nomeEn: 'Beans', preco: 20, categoriaId: opcionais.id, tenantId },
      { nome: 'Pirão', nomeEn: 'Pirão', preco: 20, categoriaId: opcionais.id, tenantId },
      { nome: 'Batata frita', nomeEn: 'French fries', preco: 30, categoriaId: opcionais.id, tenantId },
      { nome: 'Salada crua', nomeEn: 'Raw salad', preco: 15, categoriaId: opcionais.id, tenantId },
      { nome: 'Macaxeira frita', nomeEn: 'Fried cassava', preco: 30, categoriaId: opcionais.id, tenantId },
      { nome: 'Caranguejo no coco 5 unidades', nomeEn: 'Coconut crab', preco: 40, categoriaId: opcionais.id, tenantId },

      // === CALDOS ===
      { nome: 'Caldo de camarão', nomeEn: 'Shrimp broth', preco: 15, categoriaId: caldos.id, tenantId },
      { nome: 'Caldo de peixe', nomeEn: 'Fish soup', preco: 13, categoriaId: caldos.id, tenantId },

      // === PASTEL ===
      { nome: 'Carne', nomeEn: 'Beef', preco: 45, porcaoTamanho: '4 unidades', categoriaId: pastel.id, tenantId },
      { nome: 'Queijo', nomeEn: 'Cheese', preco: 45, porcaoTamanho: '4 unidades', categoriaId: pastel.id, tenantId },
      { nome: 'Camarão', nomeEn: 'Shrimp', preco: 50, porcaoTamanho: '4 unidades', categoriaId: pastel.id, tenantId },
    ],
  })

  console.log(`\n✅ Cardápio da Barraca da Vânia populado para usuário "${EMAIL}"!`)
  console.log(`   Nome do estabelecimento: ${NOME}`)
  console.log(`   Senha: ${SENHA}`)
  console.log(`   TenantId: ${tenantId}`)
  console.log(`\n📋 Categorias criadas:`)
  console.log(`   - Bebidas (26 itens)`)
  console.log(`   - Petiscos de Peixe (7 itens)`)
  console.log(`   - Petiscos de Camarão (5 itens)`)
  console.log(`   - Petiscos (5 itens)`)
  console.log(`   - Refeições (30 itens)`)
  console.log(`   - Porções Opcionais (7 itens)`)
  console.log(`   - Caldos (2 itens)`)
  console.log(`   - Pastel (3 itens)`)
  console.log(`   Total: ~85 itens`)
  console.log(`\n⚠️  Lembre-se: Não cobramos mesa nem cadeira. Cobramos 10% de taxa de serviço.\n`)
}

seedUserTeste()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
