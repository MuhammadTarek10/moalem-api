import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    description: 'The name of the user',
    required: true,
    example: 'John Doe',
  })
  @IsString()
  @Length(3, 50, { message: 'Name must be between 3 and 50 characters' })
  name: string;

  @ApiProperty({
    description: 'The email of the user',
    required: true,
    example: 'test@example.com',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    required: true,
    example: 'Test@123',
  })
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    },
  )
  @Length(8, 50, { message: 'Password must be between 8 and 50 characters' })
  password: string;

  @ApiProperty({
    description: 'The WhatsApp number of the user',
    required: true,
    example: '+201234567890',
  })
  @IsString()
  whatsapp_number: string;

  @ApiProperty({
    description: 'The governorate of the user',
    required: false,
    example: 'Cairo',
  })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiProperty({
    description: 'The education administration of the user',
    required: false,
    example: 'Nasr City',
  })
  @IsOptional()
  @IsString()
  education_administration?: string;

  @ApiProperty({
    description: 'The subjects the user is interested in',
    required: false,
    example: ['Math', 'Science'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @ApiProperty({
    description: 'The schools associated with the user',
    required: false,
    example: ['School A', 'School B'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schools?: string[];

  @ApiProperty({
    description: 'The grades the user teaches or is in',
    required: false,
    example: ['Grade 10', 'Grade 11'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grades?: string[];
}
