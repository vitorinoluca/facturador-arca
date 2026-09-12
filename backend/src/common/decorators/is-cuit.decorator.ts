import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCuit } from '../is-valid-cuit';

// Valida formato (11 dígitos) + dígito verificador real, no solo el largo.
export function IsCuit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCuit',
      target: object.constructor,
      propertyName,
      options: {
        message: 'cuit inválido (dígito verificador no coincide)',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidCuit(value);
        },
      },
    });
  };
}
