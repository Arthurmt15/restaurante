-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Categoria" ("createdAt", "id", "nome") SELECT "createdAt", "id", "nome" FROM "Categoria";
DROP TABLE "Categoria";
ALTER TABLE "new_Categoria" RENAME TO "Categoria";
CREATE UNIQUE INDEX "Categoria_nome_tenantId_key" ON "Categoria"("nome", "tenantId");
CREATE TABLE "new_Comanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mesaId" TEXT NOT NULL,
    "garcomId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxaServico" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comanda_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comanda_garcomId_fkey" FOREIGN KEY ("garcomId") REFERENCES "Garcom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comanda" ("createdAt", "garcomId", "id", "mesaId", "status", "subtotal", "taxaServico", "total", "updatedAt") SELECT "createdAt", "garcomId", "id", "mesaId", "status", "subtotal", "taxaServico", "total", "updatedAt" FROM "Comanda";
DROP TABLE "Comanda";
ALTER TABLE "new_Comanda" RENAME TO "Comanda";
CREATE TABLE "new_Garcom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Garcom" ("ativo", "createdAt", "id", "nome", "telefone", "updatedAt") SELECT "ativo", "createdAt", "id", "nome", "telefone", "updatedAt" FROM "Garcom";
DROP TABLE "Garcom";
ALTER TABLE "new_Garcom" RENAME TO "Garcom";
CREATE TABLE "new_ItemCardapio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nomeEn" TEXT,
    "descricao" TEXT,
    "preco" REAL NOT NULL,
    "porcaoTamanho" TEXT NOT NULL DEFAULT 'Única',
    "observacao" TEXT,
    "categoriaId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItemCardapio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ItemCardapio" ("ativo", "categoriaId", "createdAt", "descricao", "estoqueAtual", "estoqueMinimo", "id", "nome", "nomeEn", "observacao", "porcaoTamanho", "preco", "updatedAt") SELECT "ativo", "categoriaId", "createdAt", "descricao", "estoqueAtual", "estoqueMinimo", "id", "nome", "nomeEn", "observacao", "porcaoTamanho", "preco", "updatedAt" FROM "ItemCardapio";
DROP TABLE "ItemCardapio";
ALTER TABLE "new_ItemCardapio" RENAME TO "ItemCardapio";
CREATE TABLE "new_Mesa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LIVRE',
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Mesa" ("createdAt", "id", "numero", "status", "updatedAt") SELECT "createdAt", "id", "numero", "status", "updatedAt" FROM "Mesa";
DROP TABLE "Mesa";
ALTER TABLE "new_Mesa" RENAME TO "Mesa";
CREATE UNIQUE INDEX "Mesa_numero_tenantId_key" ON "Mesa"("numero", "tenantId");
CREATE TABLE "new_MovimentoEstoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "comandaId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentoEstoque_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemCardapio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MovimentoEstoque" ("comandaId", "createdAt", "id", "itemId", "motivo", "quantidade", "tipo") SELECT "comandaId", "createdAt", "id", "itemId", "motivo", "quantidade", "tipo" FROM "MovimentoEstoque";
DROP TABLE "MovimentoEstoque";
ALTER TABLE "new_MovimentoEstoque" RENAME TO "MovimentoEstoque";
CREATE TABLE "new_Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENTE',
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "tenantId" TEXT NOT NULL DEFAULT '',
    "ultimoLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Usuario" ("createdAt", "email", "id", "nome", "role", "senhaHash", "status", "ultimoLogin", "updatedAt") SELECT "createdAt", "email", "id", "nome", "role", "senhaHash", "status", "ultimoLogin", "updatedAt" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
