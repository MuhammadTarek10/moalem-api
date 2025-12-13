import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  AuthMethod,
  AuthMethodSchema,
} from '../../auth/schemas/auth-methods.schema';
import { CommonSchema } from '../../core/database/common.schema';
import { UserRoles } from './user-roles.enum';

@Schema({ timestamps: true })
export class User extends CommonSchema {
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: [AuthMethodSchema], required: true, select: false })
  authMethods: AuthMethod[];

  @Prop({
    type: String,
    required: true,
    enum: UserRoles,
    default: UserRoles.USER,
  })
  role: UserRoles;

  @Prop({ type: String, required: true, unique: true })
  whatsapp_number: string;

  @Prop({ type: String, required: false })
  governorate?: string;

  @Prop({ type: String, required: false })
  education_administration?: string;

  @Prop({ type: [String], required: false })
  subjects?: string[];

  @Prop({ type: [String], required: false })
  schools?: string[];

  @Prop({ type: [String], required: false })
  grades?: string[];

  @Prop({ type: Date, required: false })
  license_expires_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
