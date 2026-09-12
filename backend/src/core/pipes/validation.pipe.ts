import { BadRequestException, ValidationPipe as NestValidationPipe } from '@nestjs/common';
import { toFriendlyValidation } from './validation-message';

export const validationPipe = new NestValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
        enableImplicitConversion: true,
    },
    // Without this the API answers a blank login form with a four-item array of
    // sentences written for whoever declared the DTO. See validation-message.ts.
    exceptionFactory: (errors) => {
        const { message, errors: fields } = toFriendlyValidation(errors);
        return new BadRequestException({ message, errors: fields });
    },
});
