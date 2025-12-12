import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'The id of the user',
    example: '1234567890',
  })
  _id: string;

  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The session id of the user',
    example: '1234567890',
  })
  sessionId: string;

  @ApiProperty({
    description: 'The date and time the user was deleted',
    example: '2021-01-01T00:00:00.000Z',
  })
  deletedAt: Date;
}
