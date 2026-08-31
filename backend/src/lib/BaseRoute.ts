import { Model, Document, QueryOptions } from 'mongoose';
import { HttpError } from './comanda-utils';

/**
 * Classe utilitária genérica para rotas CRUD com isolamento por tenant.
 * Centraliza operações comuns de banco de dados, garantindo que todas as
 * consultas e mutações sejam filtradas pelo tenantId.
 *
 * @example
 * ```ts
 * const base = new BaseRoute();
 * const mesa = await base.findById(Mesa, id, tenantId);
 * ```
 */
export class BaseRoute {
  /**
   * Busca um documento por _id + tenantId.
   * Lança HttpError 404 caso não encontre.
   *
   * @param Model - Modelo Mongoose do documento
   * @param id - Identificador _id do documento
   * @param tenantId - Identificador do tenant
   * @returns Documento encontrado tipado como T
   * @throws {HttpError} 404 caso o documento não seja encontrado
   */
  async findById<T extends Document>(
    Model: Model<T>,
    id: string,
    tenantId: string
  ): Promise<T> {
    const doc = await Model.findOne({ _id: id, tenantId }).exec();
    if (!doc) {
      throw new HttpError(404, 'Registro não encontrado');
    }
    return doc;
  }

  /**
   * Busca todos os documentos de um tenant com paginação e ordenação opcionais.
   *
   * @param Model - Modelo Mongoose do documento
   * @param tenantId - Identificador do tenant
   * @param options - Opções de paginação e ordenação
   * @param options.page - Página atual (inicia em 1). Padrão: 1
   * @param options.limit - Quantidade de registros por página. Padrão: 50
   * @param options.sort - Campo de ordenação. Padrão: '-createdAt'
   * @returns Objeto com os documentos e metadados de paginação
   */
  async findAll<T extends Document>(
    Model: Model<T>,
    tenantId: string,
    options?: { page?: number; limit?: number; sort?: string }
  ): Promise<{ docs: T[]; total: number; page: number; pages: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const sort = options?.sort ?? '-createdAt';
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Model.find({ tenantId }).sort(sort).skip(skip).limit(limit).exec(),
      Model.countDocuments({ tenantId }).exec(),
    ]);

    return {
      docs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Cria um novo documento, injetando automaticamente o tenantId.
   *
   * @param Model - Modelo Mongoose do documento
   * @param data - Dados do documento (sem o tenantId)
   * @param tenantId - Identificador do tenant
   * @returns Documento criado
   */
  async create<T extends Document>(
    Model: Model<T>,
    data: Record<string, unknown>,
    tenantId: string
  ): Promise<T> {
    const doc = new Model({ ...data, tenantId });
    await doc.save();
    return doc;
  }

  /**
   * Realiza exclusão lógica de um documento (soft delete).
   * Define o campo `ativo` como `false`.
   *
   * @param Model - Modelo Mongoose do documento
   * @param id - Identificador _id do documento
   * @param tenantId - Identificador do tenant
   * @returns Documento atualizado com ativo = false
   * @throws {HttpError} 404 caso o documento não seja encontrado
   */
  async softDelete<T extends Document>(
    Model: Model<T>,
    id: string,
    tenantId: string
  ): Promise<T> {
    const doc = await Model.findOneAndUpdate(
      { _id: id, tenantId },
      { ativo: false },
      { new: true }
    ).exec();

    if (!doc) {
      throw new HttpError(404, 'Registro não encontrado');
    }
    return doc;
  }

  /**
   * Reativa um documento que havia sido desativado.
   * Define o campo `ativo` como `true`.
   *
   * @param Model - Modelo Mongoose do documento
   * @param id - Identificador _id do documento
   * @param tenantId - Identificador do tenant
   * @returns Documento atualizado com ativo = true
   * @throws {HttpError} 404 caso o documento não seja encontrado
   */
  async reactivate<T extends Document>(
    Model: Model<T>,
    id: string,
    tenantId: string
  ): Promise<T> {
    const doc = await Model.findOneAndUpdate(
      { _id: id, tenantId },
      { ativo: true },
      { new: true }
    ).exec();

    if (!doc) {
      throw new HttpError(404, 'Registro não encontrado');
    }
    return doc;
  }

  /**
   * Atualiza um documento, verificando a existência pelo tenantId.
   *
   * @param Model - Modelo Mongoose do documento
   * @param id - Identificador _id do documento
   * @param tenantId - Identificador do tenant
   * @param data - Dados a serem atualizados
   * @returns Documento atualizado
   * @throws {HttpError} 404 caso o documento não seja encontrado
   */
  async update<T extends Document>(
    Model: Model<T>,
    id: string,
    tenantId: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const doc = await Model.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: data },
      { new: true, runValidators: true }
    ).exec();

    if (!doc) {
      throw new HttpError(404, 'Registro não encontrado');
    }
    return doc;
  }
}
