import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) { }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email);

    return user;
  }

  async findWithPassword(email: string) {
    return await this.usersRepository.findWithPassword(email);
  }

  async create(dto: CreateUserDto) {
    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      authMethods: [dto.authMethod],
    });

    return user;
  }
}
