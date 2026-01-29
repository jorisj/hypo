import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'compactCurrency',
    standalone: true
})
export class CompactCurrencyPipe implements PipeTransform {

    transform(value: number): string {
        if (value === null || value === undefined) return '';

        // Handle negative numbers
        const isNegative = value < 0;
        const absValue = Math.abs(value);

        let formatted = '';

        if (absValue >= 1000000) {
            formatted = (absValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
        } else if (absValue >= 1000) {
            formatted = (absValue / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        } else {
            formatted = Math.round(absValue).toString();
        }

        return (isNegative ? '-' : '') + '€' + formatted;
    }

}
