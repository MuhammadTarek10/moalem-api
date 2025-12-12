import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { ResponseDto } from 'src/core/common/dtos/response.dto';
import { GetUser } from 'src/core/decorators/get-user.decorator';
import { ResponseMessage } from 'src/core/decorators/response-message.decorator';
import { UserResponseDto } from './dtos/responses.dto';
import { User } from './schemas/user.schema';

@ApiTags('Users')
@ApiExtraModels(ResponseDto, UserResponseDto)
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get user profile' })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('User profile retrieved successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('profile')
  getProfile(@GetUser() user: User) {
    return user;
  }
}
