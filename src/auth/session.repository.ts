import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../core/database/base.repository';
import { Session } from './schemas/session.schema';

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {
    super(sessionModel);
  }

  async findByUserId(userId: string) {
    return this.find({ userId: new Types.ObjectId(userId) });
  }

  async findByRefreshToken(refreshTokenHash: string) {
    return this.findOne({ refreshTokenHash });
  }

  async findValidSession(refreshTokenHash: string) {
    return this.findOne({
      refreshTokenHash,
      expiresAt: { $gt: new Date() },
    });
  }

  async deleteExpiredSessions() {
    return this.deleteMany({
      expiresAt: { $lte: new Date() },
    });
  }

  async deleteSession(sessionId: string) {
    await this.delete(sessionId);
  }

  async deleteUserSessions(userId: string) {
    return this.deleteMany({ userId: new Types.ObjectId(userId) });
  }

  async deleteByRefreshToken(refreshTokenHash: string) {
    return this.deleteMany({ refreshTokenHash });
  }

  async countUserSessions(userId: string) {
    return this.count({ userId: new Types.ObjectId(userId) });
  }

  async findValidSessionsByUserId(userId: string) {
    return this.find({
      userId: new Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    });
  }
}
