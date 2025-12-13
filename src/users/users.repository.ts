import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { AuthMethod } from '../auth/schemas/auth-methods.schema';
import { BaseRepository } from '../core/database/base.repository';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
    super(userModel);
  }

  async findByEmail(email: string, session?: ClientSession) {
    return session
      ? await this.userModel.findOne({ email }).session(session).exec()
      : await this.userModel.findOne({ email }).exec();
  }

  async findByAuthMethod(authMethod: AuthMethod, session?: ClientSession) {
    return session
      ? await this.userModel
          .findOne({ 'authMethods.provider': authMethod.provider })
          .session(session)
          .exec()
      : await this.userModel
          .findOne({ 'authMethods.provider': authMethod.provider })
          .exec();
  }

  async findWithPassword(email: string, session?: ClientSession) {
    return session
      ? await this.userModel
          .findOne({ email })
          .select('+authMethods')
          .session(session)
          .exec()
      : await this.userModel.findOne({ email }).select('+authMethods').exec();
  }
}
