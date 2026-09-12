import { ValidationError } from '@nestjs/common';

/**
 * Turn class-validator output into something a person can act on.
 *
 * By default this API answered a wrong login form with
 *
 *   ["email should not be empty","email must be an email",
 *    "password should not be empty","password must be a string"]
 *
 * — an array, of sentences written for whoever declared the DTO. Four of them
 * for two empty fields, one of which ("password must be a string") describes a
 * programming mistake the person filling in the form cannot make. The frontend
 * reads `message` expecting a string, so it showed its generic fallback and the
 * detail was lost anyway.
 *
 * What comes back now:
 *   message: "Enter a valid email address."          ← one sentence, shown as-is
 *   errors : { email: "Enter a valid email address." } ← per field, for the form
 *
 * `errors` is keyed by the field name the form already uses, so a client can
 * mark the offending input without parsing prose.
 */

/** Field name → what the person filling the form calls it. */
const LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  passwordConfirm: 'Password confirmation',
  fullName: 'Full name',
  name: 'Name',
  title: 'Title',
  slug: 'Slug',
  code: 'Code',
  price: 'Price',
  discountValue: 'Discount',
  discountType: 'Discount type',
  displayOrder: 'Display order',
  billingName: 'Billing name',
  billingEmail: 'Billing email',
  billingCountry: 'Country',
  paymentMethod: 'Payment method',
  quantity: 'Quantity',
  couponCode: 'Coupon code',
  headline: 'Headline',
  bio: 'Bio',
  country: 'Country',
  role: 'Role',
  status: 'Status',
  categoryId: 'Category',
  instructorId: 'Instructor',
  courseId: 'Course',
  summary: 'Summary',
  description: 'Description',
};

const label = (field: string): string =>
  LABELS[field] ??
  field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

/**
 * One sentence per failed constraint.
 *
 * The numeric bound is read back OUT of class-validator's own message
 * ("must be longer than or equal to 2 characters"), because `ValidationError`
 * exposes `constraints` as {key: message} and does not carry the arguments —
 * reaching for a `constraints[0]` array produced "must be at least undefined
 * characters", which is worse than the message it replaced.
 */
function firstNumber(raw: string): string | null {
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  return m ? m[0] : null;
}

/** Blank-field complaints come before wrong-shape ones: fill it in, THEN fix it. */
const PRIORITY: Record<string, number> = {
  isDefined: 0, isNotEmpty: 0,
  isEmail: 1, matches: 1, isEnum: 1, isUuid: 1,
  minLength: 2, maxLength: 2, min: 2, max: 2, isPositive: 2,
  isString: 3, isNumber: 3, isInt: 3, isBoolean: 3, isArray: 3,
  whitelistValidation: 9,
};

function sentence(field: string, key: string, raw: string): string | null {
  const L = label(field);
  const n = firstNumber(raw);
  switch (key) {
    case 'isNotEmpty':
    case 'isDefined':
      return `${L} is required.`;
    case 'isEmail':
      return 'Enter a valid email address.';
    case 'minLength':
      return n ? `${L} must be at least ${n} characters.` : `${L} is too short.`;
    case 'maxLength':
      return n ? `${L} must be ${n} characters or fewer.` : `${L} is too long.`;
    case 'min':
      return n ? `${L} must be ${n} or more.` : `${L} is too small.`;
    case 'max':
      return n ? `${L} must be ${n} or less.` : `${L} is too large.`;
    case 'isPositive':
      return `${L} must be greater than zero.`;
    case 'matches':
      // A DTO that wrote its own message wrote the policy, for people.
      return /must match|regular expression/i.test(raw) ? `${L} is not in the right format.` : raw;
    case 'isEnum':
      return `Choose a valid ${L.toLowerCase()}.`;
    case 'isUuid':
    case 'isNumber':
    case 'isInt':
    case 'isString':
    case 'isBoolean':
    case 'isArray':
      // Nobody types the wrong TYPE into a form; these fire when the client
      // sent the wrong thing. One plain sentence, and the detail goes to logs.
      return `${L} is not valid.`;
    case 'whitelistValidation':
      // "property role should not exist" is a client bug, never a user error.
      return null;
    default:
      return raw && !/must be|should not|should be/i.test(raw) ? raw : `${L} is not valid.`;
  }
}

export interface FriendlyValidation {
  message: string;
  errors: Record<string, string>;
}

export function toFriendlyValidation(errors: ValidationError[]): FriendlyValidation {
  const fields: Record<string, string> = {};

  const walk = (list: ValidationError[], prefix = ''): void => {
    for (const e of list) {
      const path = prefix ? `${prefix}.${e.property}` : e.property;
      if (e.children?.length) walk(e.children, path);
      const entries = Object.entries(e.constraints ?? {});
      if (!entries.length) continue;
      // One complaint per field — the most actionable one.
      entries.sort((a, b) => (PRIORITY[a[0]] ?? 5) - (PRIORITY[b[0]] ?? 5));
      for (const [key, raw] of entries) {
        const friendly = sentence(e.property, key, raw);
        if (friendly) { fields[path] = friendly; break; }
      }
    }
  };
  walk(errors);

  const all = Object.values(fields);
  const rest = all.length - 1;
  const message =
    all.length === 0
      ? 'Some of the information sent was not valid.'
      : all.length === 1
        ? all[0]
        : `${all[0]} And ${rest} other ${rest === 1 ? 'field needs' : 'fields need'} attention.`;

  return { message, errors: fields };
}
