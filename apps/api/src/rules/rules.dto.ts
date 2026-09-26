import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

const ACTION_TYPES = [
  'AUTO_APPROVE',
  'SUGGEST_CARRIER',
  'MARK_PENDING_PROCUREMENT',
] as const;

@ValidatorConstraint({ name: 'conditionJsonShape', async: false })
export class ConditionJsonConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const cond = value as Record<string, unknown>;
    if (
      cond.status !== undefined &&
      typeof cond.status !== 'string'
    ) {
      return false;
    }
    if (cond.statusIn !== undefined) {
      if (
        !Array.isArray(cond.statusIn) ||
        !cond.statusIn.every((s) => typeof s === 'string')
      ) {
        return false;
      }
    }
    if (
      cond.checkInventory !== undefined &&
      typeof cond.checkInventory !== 'boolean'
    ) {
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'conditionJson must be an object matching run-rules shape (status?, statusIn?: string[], checkInventory?: boolean)';
  }
}

@ValidatorConstraint({ name: 'actionJsonShape', async: false })
export class ActionJsonConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const action = value as Record<string, unknown>;
    if (
      typeof action.type !== 'string' ||
      !(ACTION_TYPES as readonly string[]).includes(action.type)
    ) {
      return false;
    }
    if (action.type === 'SUGGEST_CARRIER') {
      if (
        action.carrier !== undefined &&
        typeof action.carrier !== 'string'
      ) {
        return false;
      }
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `actionJson must include type in [${ACTION_TYPES.join(', ')}] (got ${JSON.stringify(args.value)})`;
  }
}

export class CreateRuleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsObject()
  @Validate(ConditionJsonConstraint)
  conditionJson!: Record<string, unknown>;

  @IsObject()
  @Validate(ActionJsonConstraint)
  actionJson!: Record<string, unknown>;
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsObject()
  @Validate(ConditionJsonConstraint)
  conditionJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @Validate(ActionJsonConstraint)
  actionJson?: Record<string, unknown>;
}

export class SetEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}
