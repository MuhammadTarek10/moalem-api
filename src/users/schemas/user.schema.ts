import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CommonSchema } from 'src/core/database/common.schema';
import {
  AuthMethod,
  AuthMethodSchema,
} from '../../auth/schemas/auth-methods.schema';

@Schema({ timestamps: true })
export class User extends CommonSchema {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [AuthMethodSchema], required: true, select: false })
  authMethods: AuthMethod[];
}

export const UserSchema = SchemaFactory.createForClass(User);
