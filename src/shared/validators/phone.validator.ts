import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js';

/**
 * Custom validator for international phone numbers using libphonenumber-js
 */
@ValidatorConstraint({ async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !value) {
      return false;
    }

    try {
      // Validate phone number (accepts international formats)
      return isValidPhoneNumber(value);
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'Please provide a valid phone number (e.g., +21612345678)';
  }
}

/**
 * Decorator to validate phone numbers
 * Supports international formats using libphonenumber-js
 *
 * @example
 * @IsPhoneNumber()
 * phone: string;
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

/**
 * Utility function to format phone number to E.164 format
 * Use this before storing in database
 */
export function formatPhoneToE164(phone: string): string | null {
  try {
    const parsed = parsePhoneNumberWithError(phone);
    return parsed ? parsed.format('E.164') : null;
  } catch {
    return null;
  }
}
