import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MortgageService, MonthlyPayment } from '../../services/mortgage.service';
import { map } from 'rxjs/operators';

interface YearlyInterest {
    year: number;
    interest: number;
}

@Component({
    selector: 'app-yearly-interest',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, RouterLink],
    template: `
    <div class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-2">
            Jaarlijks Renteoverzicht
          </h1>
          <p class="text-lg text-slate-600">Totaal betaalde rente per kalenderjaar.</p>
        </div>

        <div class="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jaar</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Betaalde Rente</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                @for (row of yearlyInterest(); track row.year) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {{ row.year }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-rose-600 text-right font-medium">
                      {{ row.interest | currency:'EUR':'symbol':'1.2-2' }}
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot class="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">Totaal</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-600 text-right">
                    {{ totalInterest() | currency:'EUR':'symbol':'1.2-2' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="flex justify-center">
          <a
            routerLink="/"
            [queryParams]="currentParams()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Terug naar Calculator
          </a>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class YearlyInterestComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private mortgageService = inject(MortgageService);

    yearlyInterest = signal<YearlyInterest[]>([]);
    totalInterest = signal<number>(0);
    currentParams = signal<any>({});

    ngOnInit() {
        this.route.queryParams.pipe(
            map(params => {
                this.currentParams.set(params);
                return {
                    amount: params['amount'] ? Number(params['amount']) : 300000,
                    startDate: params['startDate'] || new Date().toISOString().split('T')[0],
                    months: params['months'] ? Number(params['months']) : 360,
                    rate: params['rate'] ? Number(params['rate']) : 4.0
                };
            })
        ).subscribe(params => {
            this.calculateYearlyInterest(params);
        });
    }

    calculateYearlyInterest(params: any) {
        const schedule = this.mortgageService.generateSchedule({
            amount: params.amount,
            startDate: new Date(params.startDate),
            months: params.months,
            rate: params.rate
        });

        const interestByYear = new Map<number, number>();
        let total = 0;

        schedule.forEach(payment => {
            const year = payment.date.getFullYear();
            const current = interestByYear.get(year) || 0;
            interestByYear.set(year, current + payment.interest);
            total += payment.interest;
        });

        const result: YearlyInterest[] = Array.from(interestByYear.entries())
            .map(([year, interest]) => ({ year, interest }))
            .sort((a, b) => a.year - b.year);

        this.yearlyInterest.set(result);
        this.totalInterest.set(total);
    }
}
