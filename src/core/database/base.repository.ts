import {
  ClientSession,
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  Types,
} from 'mongoose';

export abstract class BaseRepository<T> {
  constructor(private readonly model: Model<T>) {}

  async startSession() {
    return await this.model.startSession();
  }

  async endSession(session: ClientSession) {
    return await session.endSession();
  }

  async abortSession(session: ClientSession) {
    return await session.abortTransaction();
  }

  async find(
    query: FilterQuery<T>,
    projection?: ProjectionType<T>,
    session?: ClientSession,
  ): Promise<T[]> {
    try {
      return session
        ? await this.model.find(query, projection).session(session).exec()
        : await this.model.find(query, projection).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(
    query: FilterQuery<T>,
    projection?: ProjectionType<T>,
    session?: ClientSession,
  ): Promise<T | null> {
    try {
      return session
        ? await this.model.findOne(query, projection).session(session).exec()
        : await this.model.findOne(query, projection).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(
    id: string,
    projection?: ProjectionType<T>,
    session?: ClientSession,
  ) {
    try {
      return session
        ? await this.model
            .findById(new Types.ObjectId(id), projection)
            .session(session)
            .exec()
        : await this.model.findById(new Types.ObjectId(id), projection).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: Partial<T>) {
    try {
      return await this.model.create(data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async createMany(data: T[]) {
    try {
      const created = await this.model.insertMany(data);
      return created;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: Partial<T>, session?: ClientSession) {
    try {
      return session
        ? await this.model
            .findByIdAndUpdate(new Types.ObjectId(id), data, {
              new: true,
            })
            .session(session)
            .exec()
        : await this.model
            .findByIdAndUpdate(new Types.ObjectId(id), data, {
              new: true,
            })
            .exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateMany(
    query: FilterQuery<T>,
    data: Partial<T>,
    session?: ClientSession,
  ) {
    try {
      return session
        ? await this.model.updateMany(query, data).session(session).exec()
        : await this.model.updateMany(query, data).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string, session?: ClientSession) {
    try {
      return session
        ? await this.model
            .findByIdAndDelete(new Types.ObjectId(id))
            .session(session)
            .exec()
        : await this.model.findByIdAndDelete(new Types.ObjectId(id)).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteMany(query: FilterQuery<T>, session?: ClientSession) {
    try {
      return session
        ? await this.model.deleteMany(query).session(session).exec()
        : await this.model.deleteMany(query).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async count(query: FilterQuery<T>, session?: ClientSession) {
    try {
      return session
        ? await this.model.countDocuments(query).session(session).exec()
        : await this.model.countDocuments(query).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async exists(query: FilterQuery<T>, session?: ClientSession) {
    try {
      return session
        ? (await this.model.exists(query).session(session).exec()) !== null
        : (await this.model.exists(query).exec()) !== null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async aggregate(pipeline: PipelineStage[], session?: ClientSession) {
    try {
      return session
        ? await this.model.aggregate<T>(pipeline).session(session).exec()
        : await this.model.aggregate<T>(pipeline).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  protected handleError(error: any): never {
    throw error;
  }
}
