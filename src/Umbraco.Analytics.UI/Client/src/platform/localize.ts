/**
 * What our components need from a localization controller. `UmbLocalizationController` satisfies it as is,
 * so helpers can take this instead of the backoffice type.
 */
export interface UauiLocalize {
    lang(): string;
    term(key: string, ...args: unknown[]): string;
    date(date: Date | string, options?: Intl.DateTimeFormatOptions): string;
    number(number: number | string, options?: Intl.NumberFormatOptions): string;
}
