/**
 * Every country, named in the language the app is speaking.
 *
 * The checkout and the profile each offered three: Bangladesh, the United
 * States and the United Kingdom. A learner anywhere else had to claim to live
 * in one of them.
 *
 * The list is ISO 3166-1 alpha-2 codes; the NAMES come from `Intl.DisplayNames`,
 * so the browser supplies "Bangladesh" or "방글라데시" without this file holding
 * a translation table that would go stale. Where the runtime has no display
 * names (very old engines), the code itself is shown rather than nothing.
 */
const CODES = [
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT',
  'BO','BA','BW','BR','BN','BG','BF','BI','KH','CM','CA','CV','CF','TD','CL','CN','CO','KM','CG','CD',
  'CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI',
  'FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HK','HU','IS','IN','ID','IR',
  'IQ','IE','IL','IT','JM','JP','JO','KZ','KE','KI','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT',
  'LU','MO','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM',
  'NA','NR','NP','NL','NZ','NI','NE','NG','KP','MK','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH',
  'PL','PT','QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI',
  'SB','SO','ZA','KR','SS','ES','LK','SD','SR','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TO','TT',
  'TN','TR','TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW',
];

export interface Country {
  code: string;
  name: string;
}

/** Sorted by name in `locale`, so the list reads correctly in each language. */
export function countryList(locale: string): Country[] {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale || 'en'], { type: 'region' });
  } catch {
    display = null;
  }
  const items = CODES.map((code) => ({
    code,
    name: (() => {
      try {
        return display?.of(code) ?? code;
      } catch {
        return code;
      }
    })(),
  }));
  const collator = new Intl.Collator(locale || 'en');
  return items.sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * Accounts store the country by NAME (the column is a varchar of whatever the
 * old three-item select sent), so an existing value that is not in the list —
 * a name from another language, or one of the three originals — is kept as an
 * option rather than silently reset to the first country alphabetically.
 */
export function withStored(list: Country[], stored: string | null | undefined): Country[] {
  const value = (stored ?? '').trim();
  if (!value || list.some((c) => c.name === value)) return list;
  return [{ code: value, name: value }, ...list];
}
