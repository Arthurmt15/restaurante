import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Popula o banco com dados iniciais do cardápio da Barraca da Vânia
async function seed() {
  await prisma.movimentoEstoque.deleteMany()
  await prisma.itemComanda.deleteMany()
  await prisma.comanda.deleteMany()
  await prisma.itemCardapio.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.mesa.deleteMany()
  await prisma.garcom.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.usuario.deleteMany()

  // Cria usuário demo — todos os dados do seed serão associados ao tenantId dele
  const demoSenhaHash = await bcrypt.hash('12345678', 12)
  const demo = await prisma.usuario.create({
    data: {
      email: 'demo@restaurante.com',
      nome: 'Barraca da Vânia',
      senhaHash: demoSenhaHash,
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId: '', // será atualizado logo abaixo
    },
  })
  // tenantId = próprio id
  await prisma.usuario.update({
    where: { id: demo.id },
    data: { tenantId: demo.id },
  })

  const tenantId = demo.id

  await prisma.garcom.createMany({
    data: [
      { nome: 'Carlos Silva', tenantId },
      { nome: 'Ana Oliveira', tenantId },
      { nome: 'Pedro Santos', tenantId },
      { nome: 'Marina Costa', tenantId },
    ],
  })

  await prisma.mesa.createMany({
    data: [
      { numero: 1, tenantId }, { numero: 2, tenantId }, { numero: 3, tenantId }, { numero: 4, tenantId },
      { numero: 5, tenantId }, { numero: 6, tenantId }, { numero: 7, tenantId }, { numero: 8, tenantId },
      { numero: 9, tenantId }, { numero: 10, tenantId },
    ],
  })

  const bebidas = await prisma.categoria.create({ data: { nome: 'Bebidas', tenantId } })
  const dose = await prisma.categoria.create({ data: { nome: 'Dose', tenantId } })
  const petPeixe = await prisma.categoria.create({ data: { nome: 'Petiscos de peixe', tenantId } })
  const petCamarao = await prisma.categoria.create({ data: { nome: 'Petiscos de camarão', tenantId } })
  const petisco = await prisma.categoria.create({ data: { nome: 'Petisco', tenantId } })
  const refeicoes = await prisma.categoria.create({ data: { nome: 'Refeições', tenantId } })
  const opcionais = await prisma.categoria.create({ data: { nome: 'Porções Opcionais', tenantId } })
  const caldos = await prisma.categoria.create({ data: { nome: 'Caldos', tenantId } })
  const pastel = await prisma.categoria.create({ data: { nome: 'Pastel', tenantId } })

  await prisma.itemCardapio.createMany({
    data: [
      // === BEBIDAS ===
      { nome: 'Cerveja garrafa 600ml', nomeEn: 'Beer bottle 600ml', preco: 12, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Malte', nomeEn: 'Beer bottle 600ml Malt', preco: 12, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja Devassa 600ml', nomeEn: 'Beer Devassa', preco: 16, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Original', nomeEn: 'Beer bottle Original 600ml', preco: 18, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Budweiser', nomeEn: 'Beer bottle Budweiser 600ml', preco: 17, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Stella Artois', nomeEn: 'Beer bottle Stella Artois 600ml', preco: 18, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Cerveja garrafa 600ml Heineken', nomeEn: 'Beer bottle Heineken 600ml', preco: 18, porcaoTamanho: '600ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Refrigerante lata', nomeEn: 'Soda can', preco: 6, porcaoTamanho: '350ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Refrigerante 1 litro', nomeEn: 'Refrigerant 1 liter', preco: 12, porcaoTamanho: '1 Litro', categoriaId: bebidas.id, tenantId },
      { nome: 'Água de coco', nomeEn: 'Coconut water', preco: 6, porcaoTamanho: 'Copo/Taça', categoriaId: bebidas.id, tenantId },
      { nome: 'Água mineral', nomeEn: 'Mineral water', preco: 4, porcaoTamanho: 'Garrafa', categoriaId: bebidas.id, tenantId },
      { nome: 'Água mineral com gás', nomeEn: 'Carbonated mineral water', preco: 5, porcaoTamanho: 'Garrafa', categoriaId: bebidas.id, tenantId },
      { nome: 'Suco copo 400ml', nomeEn: 'Juice cup', preco: 8, porcaoTamanho: '400ml', categoriaId: bebidas.id, tenantId },
      { nome: 'Suco jarra 1L', nomeEn: 'Juice jar 1L', preco: 25, porcaoTamanho: '1 Litro', categoriaId: bebidas.id, tenantId },
      { nome: 'Hula-Hula', nomeEn: 'Hula-hula', preco: 25, porcaoTamanho: 'Taça', categoriaId: bebidas.id, tenantId },
      { nome: 'Caipirinha', preco: 13, porcaoTamanho: 'Taça', categoriaId: bebidas.id, tenantId },
      { nome: 'Caipirosca', preco: 15, porcaoTamanho: 'Taça', categoriaId: bebidas.id, tenantId },
      { nome: 'Caipifrutas', preco: 17, porcaoTamanho: 'Taça', categoriaId: bebidas.id, tenantId },
      { nome: 'Red Bull', preco: 14, porcaoTamanho: 'Lata', categoriaId: bebidas.id, tenantId },

      // === DOSE ===
      { nome: 'Pinga', nomeEn: 'Cachaça/Pinga', preco: 3, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },
      { nome: 'Ypioca', preco: 4, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },
      { nome: 'Conhaque', nomeEn: 'Cognac/Brandy', preco: 7, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },
      { nome: 'Montilla', nomeEn: 'Rum Montilla', preco: 10, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },
      { nome: 'Vodka Smirnoff', preco: 10, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },
      { nome: 'Campari', preco: 8, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },
      { nome: 'Whisky', preco: 14, porcaoTamanho: 'Dose', categoriaId: dose.id, tenantId },

      // === PETISCOS DE PEIXE ===
      { nome: 'Peixe frito P (Posta)', nomeEn: 'Small fried fish - Slice', preco: 95, porcaoTamanho: 'P - Posta', categoriaId: petPeixe.id, tenantId },
      { nome: 'Peixe frito M (Posta)', nomeEn: 'Medium fried fish - Slice', preco: 100, porcaoTamanho: 'M - Posta', categoriaId: petPeixe.id, tenantId },
      { nome: 'Peixe frito G (Posta)', nomeEn: 'Large fried fish - Slice', preco: 105, porcaoTamanho: 'G - Posta', categoriaId: petPeixe.id, tenantId },
      { nome: 'Peixe frito P (Inteiro)', nomeEn: 'Small fried fish - Whole', preco: 110, porcaoTamanho: 'P - Inteiro', categoriaId: petPeixe.id, tenantId },
      { nome: 'Peixe frito M (Inteiro)', nomeEn: 'Medium fried fish - Whole', preco: 115, porcaoTamanho: 'M - Inteiro', categoriaId: petPeixe.id, tenantId },
      { nome: 'Peixe frito G (Inteiro)', nomeEn: 'Large fried fish - Whole', preco: 125, porcaoTamanho: 'G - Inteiro', categoriaId: petPeixe.id, tenantId },
      { nome: 'Isca de peixe', nomeEn: 'Fish bait', preco: 100, porcaoTamanho: 'Porção', categoriaId: petPeixe.id, tenantId },

      // === PETISCOS DE CAMARÃO ===
      { nome: 'Camarão à milanesa', nomeEn: 'Milanese Shrimp', preco: 105, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petCamarao.id, tenantId },
      { nome: 'Camarão alho e óleo', nomeEn: 'Shrimp garlic and oil', preco: 95, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petCamarao.id, tenantId },
      { nome: 'Camarão no bafo', nomeEn: 'Shrimp in the steam', preco: 105, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petCamarao.id, tenantId },
      { nome: 'Camarão descascado', nomeEn: 'Peeled Shrimp', preco: 115, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petCamarao.id, tenantId },
      { nome: 'Lagosta', nomeEn: 'Lobster', preco: 135, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petCamarao.id, tenantId },

      // === PETISCO ===
      { nome: 'Carne de sol', nomeEn: 'Sun dried meat', preco: 95, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petisco.id, tenantId },
      { nome: 'Frango à passarinho', nomeEn: 'Chicken with the little bird', preco: 85, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petisco.id, tenantId },
      { nome: 'Frango à milanesa', nomeEn: 'Breaded chicken', preco: 95, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petisco.id, tenantId },
      { nome: 'Paçoca de carne sol', nomeEn: 'Meat lover of sunshine', preco: 95, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petisco.id, tenantId },
      { nome: 'Filé com fritas', nomeEn: 'Stake and fries', preco: 95, porcaoTamanho: 'Porção', observacao: 'Acompanha Batata ou Macaxeira', categoriaId: petisco.id, tenantId },

      // === REFEIÇÕES ===
      { nome: 'Peixe frito (posta)', nomeEn: 'Fried fish - fish post', preco: 120, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe frito (posta)', nomeEn: 'Fried fish - fish post', preco: 150, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe frito (inteiro)', nomeEn: 'Whole fried fish', preco: 140, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe frito (inteiro)', nomeEn: 'Whole fried fish', preco: 170, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe ao molho de camarão (posta)', nomeEn: 'Fish steak with shrimp sauce', preco: 150, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe ao molho de camarão (posta)', nomeEn: 'Fish steak with shrimp sauce', preco: 180, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe ao molho de camarão (inteiro)', nomeEn: 'Fish in shrimp sauce - whole', preco: 170, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixe ao molho de camarão (inteiro)', nomeEn: 'Fish in shrimp sauce - whole', preco: 200, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Isca de peixe', nomeEn: 'Fish bait', preco: 130, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Isca de peixe', nomeEn: 'Fish bait', preco: 140, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Carne de sol', nomeEn: 'Sun dried meat', preco: 130, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Carne de sol', nomeEn: 'Sun dried meat', preco: 160, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão alho e óleo', nomeEn: 'Garlic and oil shrimp', preco: 125, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão alho e óleo', nomeEn: 'Garlic and oil shrimp', preco: 155, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão à milanesa', nomeEn: 'Milanese Shrimp', preco: 135, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão à milanesa', nomeEn: 'Milanese Shrimp', preco: 165, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão descascado', nomeEn: 'Peeled shrimp', preco: 150, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão descascado', nomeEn: 'Peeled shrimp', preco: 180, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão ensopado', nomeEn: 'Stewed shrimp', preco: 130, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Camarão ensopado', nomeEn: 'Stewed shrimp', preco: 160, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Paçoca de carne de sol', nomeEn: 'Beef stew', preco: 130, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Paçoca de carne de sol', nomeEn: 'Beef stew', preco: 160, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Frango à passarinho', nomeEn: 'Chicken with the little bird', preco: 110, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Frango à passarinho', nomeEn: 'Chicken with the little bird', preco: 140, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Misto', nomeEn: 'Mixed Platter', preco: 260, porcaoTamanho: 'Para 4 pessoas', observacao: 'Serve 4 pessoas (peixe, carne de sol e camarão)', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixada', nomeEn: 'Fish', preco: 140, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Peixada', nomeEn: 'Fish', preco: 170, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Galinha Caipira', nomeEn: 'Free-range chicken', preco: 120, porcaoTamanho: 'Para 2 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Galinha Caipira', nomeEn: 'Free-range chicken', preco: 150, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },
      { nome: 'Lagosta', nomeEn: 'Lobster', preco: 190, porcaoTamanho: 'Para 4 pessoas', observacao: 'Acompanha Arroz, Feijão, Salada e Farofa na Manteiga', categoriaId: refeicoes.id, tenantId },

      // === PORÇÕES OPCIONAIS ===
      { nome: 'Arroz', nomeEn: 'Rice', preco: 20, porcaoTamanho: 'Porção', categoriaId: opcionais.id, tenantId },
      { nome: 'Feijão', nomeEn: 'Beans', preco: 20, porcaoTamanho: 'Porção', categoriaId: opcionais.id, tenantId },
      { nome: 'Pirão', preco: 20, porcaoTamanho: 'Porção', categoriaId: opcionais.id, tenantId },
      { nome: 'Batata frita', nomeEn: 'French fries', preco: 30, porcaoTamanho: 'Porção', categoriaId: opcionais.id, tenantId },
      { nome: 'Salada crua', nomeEn: 'Raw salad', preco: 15, porcaoTamanho: 'Porção', categoriaId: opcionais.id, tenantId },
      { nome: 'Macaxeira frita', nomeEn: 'Fried macaxeira', preco: 30, porcaoTamanho: 'Porção', categoriaId: opcionais.id, tenantId },
      { nome: 'Caranguejo no coco', nomeEn: 'Coconut crab', preco: 40, porcaoTamanho: '5 unidades', categoriaId: opcionais.id, tenantId },

      // === CALDOS ===
      { nome: 'Caldo de camarão', nomeEn: 'Shrimp broth', preco: 15, porcaoTamanho: 'Tigela/Copo', categoriaId: caldos.id, tenantId },
      { nome: 'Caldo de peixe', nomeEn: 'Fish soup', preco: 13, porcaoTamanho: 'Tigela/Copo', categoriaId: caldos.id, tenantId },

      // === PASTEL ===
      { nome: 'Carne', nomeEn: 'Beef', preco: 45, porcaoTamanho: '4 unidades', categoriaId: pastel.id, tenantId },
      { nome: 'Queijo', nomeEn: 'Cheese', preco: 45, porcaoTamanho: '4 unidades', categoriaId: pastel.id, tenantId },
      { nome: 'Camarão', nomeEn: 'Shrimp', preco: 50, porcaoTamanho: '4 unidades', categoriaId: pastel.id, tenantId },
    ],
  })

  console.log(`Cardápio da Barraca da Vânia seedado com sucesso!`)
  console.log(`\n🔑 Usuário demo criado:`)
  console.log(`   Email: demo@restaurante.com`)
  console.log(`   Senha: 12345678`)
  console.log(`   TenantId: ${tenantId}\n`)
}

seed()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
