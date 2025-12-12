import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class AuthMethod {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: false })
  providerId?: string;
}

export const AuthMethodSchema = SchemaFactory.createForClass(AuthMethod);
