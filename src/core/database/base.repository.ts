import {
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  Types,
} from 'mongoose';

export abstract class BaseRepository<T> {
  constructor(private readonly model: Model<T>) {}

  async find(
    query: FilterQuery<T>,
    projection?: ProjectionType<T>,
  ): Promise<T[]> {
    try {
      return await this.model.find(query, projection).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(
    query: FilterQuery<T>,
    projection?: ProjectionType<T>,
  ): Promise<T | null> {
    try {
      return await this.model.findOne(query, projection).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(id: string, projection?: ProjectionType<T>) {
    try {
      return await this.model
        .findById(new Types.ObjectId(id), projection)
        .exec();
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

  async update(id: string, data: Partial<T>) {
    try {
      return await this.model
        .findByIdAndUpdate(new Types.ObjectId(id), data, {
          new: true,
        })
        .exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateMany(query: FilterQuery<T>, data: Partial<T>) {
    try {
      await this.model.updateMany(query, data).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string) {
    try {
      return await this.model.findByIdAndDelete(new Types.ObjectId(id)).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteMany(query: FilterQuery<T>) {
    try {
      await this.model.deleteMany(query).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async count(query: FilterQuery<T>) {
    try {
      return await this.model.countDocuments(query).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  async exists(query: FilterQuery<T>) {
    try {
      return (await this.model.exists(query).exec()) !== null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async aggregate(pipeline: PipelineStage[]) {
    try {
      return await this.model.aggregate<T>(pipeline).exec();
    } catch (error) {
      this.handleError(error);
    }
  }

  protected handleError(error: any): never {
    throw error;
  }
}
