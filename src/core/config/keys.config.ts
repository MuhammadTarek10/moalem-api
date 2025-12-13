import { registerAs } from '@nestjs/config';

export default registerAs('keys', () => ({
  private_key: process.env.PRIVATE_KEY ?? '',
  public_key: process.env.PUBLIC_KEY ?? '',
}));
