import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  AuthMethod,
  AuthMethodSchema,
} from '../../auth/schemas/auth-methods.schema';
import { CommonSchema } from '../../core/database/common.schema';

@Schema({ timestamps: true })
export class User extends CommonSchema {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [AuthMethodSchema], required: true, select: false })
  authMethods: AuthMethod[];

  @Prop({ required: true, unique: true })
  whatsapp_number: string;

  @Prop({ required: false })
  governorate: string;

  @Prop({ required: false })
  education_administration: string;

  @Prop({ required: false })
  subjects: string[];

  @Prop({ required: false })
  schools: string[];

  @Prop({ required: false })
  grades: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
