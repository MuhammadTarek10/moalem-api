import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class AuthMethod {
  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: false })
  passwordHash?: string;

  @Prop({ type: String, required: false })
  providerId?: string;
}

export const AuthMethodSchema = SchemaFactory.createForClass(AuthMethod);
