
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MortgageService, YearlyInterest, DEFAULT_MORTGAGE_PARAMS } from '../../services/mortgage.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-yearly-interest',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './yearly-interest.component.html',
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
          amount: params['amount'] ? Number(params['amount']) : DEFAULT_MORTGAGE_PARAMS.amount,
          startDate: params['startDate'] || new Date().toISOString().split('T')[0],
          months: params['months'] ? Number(params['months']) : DEFAULT_MORTGAGE_PARAMS.months,
          rate: params['rate'] ? Number(params['rate']) : DEFAULT_MORTGAGE_PARAMS.rate
        };
      })
    ).subscribe(params => {
      this.calculate(params);
    });
  }

  calculate(params: any) {
    const schedule = this.mortgageService.generateSchedule({
      amount: params.amount,
      startDate: new Date(params.startDate),
      months: params.months,
      rate: params.rate
    });

    const { yearly, total } = this.mortgageService.calculateYearlyInterest(schedule);

    this.yearlyInterest.set(yearly);
    this.totalInterest.set(total);
  }
}

