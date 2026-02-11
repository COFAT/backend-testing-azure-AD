import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator to check minimum age
 */
@ValidatorConstraint({ async: false })
export class IsMinAgeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string' || !value) {
      return false;
    }

    const [minAge] = args.constraints as [number];

    try {
      const birthDate = new Date(value);

      // Check if valid date
      if (isNaN(birthDate.getTime())) {
        return false;
      }

      // Check if date is not in the future
      const today = new Date();
      if (birthDate > today) {
        return false;
      }

      // Calculate age
      const age = calculateAge(birthDate);
      return age >= minAge;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [minAge] = args.constraints as [number];
    return `You must be at least ${minAge} years old`;
  }
}

/**
 * Decorator to validate minimum age based on date of birth
 *
 * @param minAge - Minimum age required (default: 16)
 * @example
 * @IsMinAge(16)
 * dateOfBirth: string;
 */
export function IsMinAge(
  minAge: number = 18,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [minAge],
      validator: IsMinAgeConstraint,
    });
  };
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}
