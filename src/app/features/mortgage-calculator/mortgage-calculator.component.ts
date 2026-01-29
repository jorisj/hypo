import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MortgageService, MonthlyPayment, DEFAULT_MORTGAGE_PARAMS } from '../../services/mortgage.service';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-mortgage-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink, BaseChartDirective],
  templateUrl: './mortgage-calculator.component.html',
  styles: []
})
export class MortgageCalculatorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    amount: [DEFAULT_MORTGAGE_PARAMS.amount, [Validators.required, Validators.min(0)]],
    startDate: [new Date().toISOString().split('T')[0], Validators.required],
    months: [DEFAULT_MORTGAGE_PARAMS.months, [Validators.required, Validators.min(1)]],
    rate: [DEFAULT_MORTGAGE_PARAMS.rate, [Validators.required, Validators.min(0)]]
  });

  // Signals for derived state
  schedule = signal<MonthlyPayment[]>([]);
  currentDebt = signal<number>(0);
  monthlyPayment = signal<number>(0);
  settingsCollapsed = signal<boolean>(true);
  showFullSchedule = signal<boolean>(false);

  progressPercentage = computed(() => {
    const amount = this.form.get('amount')?.value || 1;
    const debt = this.currentDebt();
    const paid = amount - debt;
    return (paid / amount) * 100;
  });

  public lineChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const schedule = this.schedule();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      labels: schedule.map(p => {
        const d = p.date;
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
      }),
      datasets: [
        {
          data: schedule.map(p => p.remainingDebt),
          label: 'Restschuld',
          fill: true,
          tension: 0.5,
          borderColor: 'rgb(79, 70, 229)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          pointRadius: schedule.map(p =>
            p.date.getMonth() === currentMonth && p.date.getFullYear() === currentYear ? 6 : 0
          ),
          pointBackgroundColor: schedule.map(p =>
            p.date.getMonth() === currentMonth && p.date.getFullYear() === currentYear ? 'rgb(79, 70, 229)' : 'rgba(0,0,0,0)'
          ),
          pointHitRadius: 10
        }
      ]
    };
  });

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
          color: '#334155'
        },
        ticks: {
          maxTicksLimit: 8,
          maxRotation: 0,
          color: '#94a3b8'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#334155' // Slate 700 - visible on dark, subtle on light
        },
        ticks: {
          color: '#94a3b8' // Slate 400 - readable on both
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };

  toggleSettings() {
    this.settingsCollapsed.update(v => !v);
  }

  toggleScheduleView() {
    this.showFullSchedule.update(v => !v);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (Object.keys(params).length > 0) {
        this.form.patchValue({
          amount: params['amount'] ? Number(params['amount']) : this.form.value.amount,
          startDate: params['startDate'] || this.form.value.startDate,
          months: params['months'] ? Number(params['months']) : this.form.value.months,
          rate: params['rate'] ? Number(params['rate']) : this.form.value.rate
        }, { emitEvent: false }); // Don't trigger valueChanges
        this.calculate();
      } else {
        // Initial calculation with defaults
        this.calculate();
      }
    });

    // 2. Listen to form changes -> Update URL & Calculate
    this.form.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(values => {
      this.updateUrl(values);
      this.calculate();
    });
  }

  calculate() {
    if (this.form.invalid) return;

    const { amount, startDate, months, rate } = this.form.value;
    const params = {
      amount: Number(amount),
      startDate: new Date(startDate),
      months: Number(months),
      rate: Number(rate)
    };

    const schedule = this.mortgageService.generateSchedule(params);
    const debt = this.mortgageService.getCurrentDebt(params, schedule);
    const payment = this.mortgageService.calculateMonthlyPayment(params.amount, params.rate, params.months);

    this.schedule.set(schedule);
    this.currentDebt.set(debt);
    this.monthlyPayment.set(payment);
  }

  updateUrl(values: any) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: values,
      queryParamsHandling: 'merge',
      replaceUrl: true // Don't clutter history with every keystroke
    });
  }
}
