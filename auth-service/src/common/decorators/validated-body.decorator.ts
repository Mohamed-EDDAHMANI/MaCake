import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ServiceError } from '../exceptions';


export const ValidatedBody = (DtoClass: new () => any) =>
  createParamDecorator(
    async (_: unknown, context: ExecutionContext) => {
      const data = context.switchToRpc().getData();
      // console.log('ValidatedBody - Incoming data:', data);
      if (!data?.body) {
        throw new ServiceError('VALIDATION_ERROR', 'Request body is missing', 400, 'auth-service');
      }

      const dto = plainToInstance(DtoClass, data.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const validationErrors: Record<string, string[]> = {};
        errors.forEach(error => {
          if (error.constraints) {
            validationErrors[error.property] = Object.values(error.constraints);
          }
        });

        throw new ServiceError('VALIDATION_ERROR', 'Validation failed', 400, 'auth-service', { validationErrors });
      }

      return dto;
    },
  )();
