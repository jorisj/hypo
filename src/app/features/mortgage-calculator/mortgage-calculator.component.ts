import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MortgageService, MonthlyPayment } from '../../services/mortgage.service';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'app-mortgage-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-2">
            Hypotheek Overzicht
          </h1>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Form Section -->
          <div class="lg:col-span-1">
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div class="p-4 bg-indigo-600 flex justify-between items-center cursor-pointer" (click)="toggleSettings()">
                <h2 class="text-lg font-bold text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  Instellingen
                </h2>
                <button type="button" class="text-white hover:bg-indigo-500 rounded-full p-1 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform duration-200" [class.-rotate-90]="settingsCollapsed()">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
              @if (!settingsCollapsed()) {
              <div class="p-4 space-y-4">
                <form [formGroup]="form" class="space-y-4">
                  <!-- Mortgage Amount -->
                  <div>
                    <label for="amount" class="block text-sm font-medium text-slate-700 mb-1">Hypotheekbedrag</label>
                    <div class="relative rounded-md shadow-sm">
                      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span class="text-slate-500 sm:text-sm">€</span>
                      </div>
                      <input
                        type="number"
                        id="amount"
                        formControlName="amount"
                        class="block w-full rounded-md border-slate-300 pl-7 py-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border shadow-sm"
                        placeholder="300000"
                      />
                    </div>
                  </div>

                  <!-- Start Date -->
                  <div>
                    <label for="startDate" class="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
                    <input
                      type="date"
                      id="startDate"
                      formControlName="startDate"
                      class="block w-full rounded-md border-slate-300 py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border shadow-sm"
                    />
                  </div>

                  <!-- Duration (Months) -->
                  <div>
                    <label for="months" class="block text-sm font-medium text-slate-700 mb-1">Looptijd (maanden)</label>
                    <input
                      type="number"
                      id="months"
                      formControlName="months"
                      class="block w-full rounded-md border-slate-300 py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border shadow-sm"
                    />
                  </div>

                  <!-- Interest Rate -->
                  <div>
                    <label for="rate" class="block text-sm font-medium text-slate-700 mb-1">Rentepercentage (%)</label>
                    <div class="relative rounded-md shadow-sm">
                      <input
                        type="number"
                        id="rate"
                        formControlName="rate"
                        step="0.01"
                        class="block w-full rounded-md border-slate-300 py-2 px-3 pr-8 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border shadow-sm"
                      />
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span class="text-slate-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              }
            </div>
          </div>

          <!-- Results Section -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Current Debt -->
              <div class="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-indigo-500 flex flex-col justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500 uppercase tracking-wider">Huidige Restschuld</p>
                  <h3 class="text-3xl font-bold text-slate-900 mt-2">
                    {{ currentDebt() | currency:'EUR':'symbol':'1.0-0' }}
                  </h3>
                </div>
                <div class="mt-4">
                  <div class="w-full bg-slate-200 rounded-full h-2.5">
                    <div class="bg-indigo-600 h-2.5 rounded-full" [style.width.%]="progressPercentage()"></div>
                  </div>
                  <p class="text-xs text-slate-500 mt-2 text-right">{{ progressPercentage() | number:'1.0-1' }}% Afgelost</p>
                </div>
              </div>

              <!-- Monthly Payment -->
              <div class="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-emerald-500 flex flex-col justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500 uppercase tracking-wider">Maandlast (Bruto)</p>
                  <h3 class="text-3xl font-bold text-slate-900 mt-2">
                    {{ monthlyPayment() | currency:'EUR':'symbol':'1.2-2' }}
                  </h3>
                </div>
              </div>
            </div>

            <!-- Schedule Preview -->
             <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-slate-900">
                  Aflossingsschema {{ showFullSchedule() ? '' : '(Eerste 12 maanden)' }}
                </h3>
              </div>
              <div class="overflow-x-auto" [class.max-h-[600px]]="showFullSchedule()" [class.overflow-y-auto]="showFullSchedule()">
                <table class="min-w-full divide-y divide-slate-200 relative">
                  <thead class="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Datum</th>
                      <th scope="col" class="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Bedrag</th>
                      <th scope="col" class="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Rente</th>
                      <th scope="col" class="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Aflossing</th>
                      <th scope="col" class="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Restschuld</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-slate-200">
                    @for (row of (showFullSchedule() ? schedule() : schedule().slice(0, 12)); track row.month) {
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                          {{ row.date | date:'MMMM yyyy' }}
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                          {{ row.payment | currency:'EUR':'symbol':'1.2-2' }}
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-rose-600 text-right">
                          {{ row.interest | currency:'EUR':'symbol':'1.2-2' }}
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-emerald-600 text-right">
                          {{ row.principal | currency:'EUR':'symbol':'1.2-2' }}
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                          {{ row.remainingDebt | currency:'EUR':'symbol':'1.0-0' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-center">
                <button
                  type="button"
                  (click)="toggleScheduleView()"
                  class="text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none focus:underline"
                >
                  {{ showFullSchedule() ? 'Toon minder' : 'Toon alles' }}
                </button>
              </div>
            </div>

          </div>
          
          <div class="mt-8 text-center">
            <a 
              routerLink="/yearly-interest" 
              queryParamsHandling="preserve"
              class="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              Bekijk jaarlijks renteoverzicht &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class MortgageCalculatorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    amount: [300000, [Validators.required, Validators.min(0)]],
    startDate: [new Date().toISOString().split('T')[0], Validators.required],
    months: [360, [Validators.required, Validators.min(1)]],
    rate: [4.0, [Validators.required, Validators.min(0)]]
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

  toggleSettings() {
    this.settingsCollapsed.update(v => !v);
  }

  toggleScheduleView() {
    this.showFullSchedule.update(v => !v);
  }

  ngOnInit() {
    // 1. Initialize form from URL params
    this.route.queryParams.pipe(
      map(params => ({
        amount: params['amount'] ? Number(params['amount']) : 300000,
        startDate: params['startDate'] || new Date().toISOString().split('T')[0],
        months: params['months'] ? Number(params['months']) : 360,
        rate: params['rate'] ? Number(params['rate']) : 4.0
      }))
    ).subscribe(initialValues => {
      // Only patch if values are different to avoid loops (though setValue handles check usually)
      // But we need to be careful not to overwrite user input if they are typing.
      // Actually, we only want to do this ONCE on load usually, or if the user navigates back/forward.
      // For now, let's just patch it once on init, and then listen to form changes to update URL.
      // However, if we want deep linking to work, we need to respect the params.

      // A simple strategy:
      // On Init: Read params -> Update Form.
      // On Form Change: Update URL.

      // We need to make sure we don't create an infinite loop if URL update triggers param subscription.
      // But we are in ngOnInit, and we can take(1) if we only care about initial load.
      // If the user clicks "Back", we might want to update the form.
    });

    // Let's use take(1) for initial load to avoid complexity for now, unless we need full bi-directional sync on history navigation.
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
    const debt = this.mortgageService.getCurrentDebt(params);
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
