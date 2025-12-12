import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto, ResponseStatus } from '../common/dtos/response.dto';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseDto<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseDto<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ||
      'Operation successful';

    return next.handle().pipe(
      map((data) => {
        if (data instanceof ResponseDto) {
          return data;
        }
        return new ResponseDto(data, message, ResponseStatus.SUCCESS);
      }),
    ) as Observable<ResponseDto<T>>;
  }
}
