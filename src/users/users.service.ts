import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './schemas/user.schema';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string, session?: ClientSession) {
    const user = await this.usersRepository.findById(id, undefined, session);

    return user;
  }

  async findByEmail(email: string, session?: ClientSession) {
    const user = await this.usersRepository.findByEmail(email, session);

    return user;
  }

  async findWithPassword(email: string, session?: ClientSession) {
    return await this.usersRepository.findWithPassword(email, session);
  }

  async create(dto: CreateUserDto) {
    const user = await this.usersRepository.create({
      ...dto,
      authMethods: [dto.authMethod],
    });

    return user;
  }

  async update(id: string, data: Partial<User>, session?: ClientSession) {
    return await this.usersRepository.update(id, data, session);
  }
}
