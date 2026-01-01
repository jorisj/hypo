import { Injectable } from '@angular/core';

export interface MortgageParams {
  amount: number;
  rate: number; // Annual interest rate in percentage
  months: number;
  startDate: Date;
}

export interface MonthlyPayment {
  month: number;
  date: Date;
  payment: number;
  interest: number;
  principal: number;
  remainingDebt: number;
}

export const DEFAULT_MORTGAGE_PARAMS = {
  amount: 300000,
  months: 360,
  rate: 4.0
} as const;

export interface YearlyInterest {
  year: number;
  interest: number;
}

@Injectable({
  providedIn: 'root',
})
export class MortgageService {
  /**
   * Calculates the monthly annuity payment.
   * Formula: M = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
   * where r is monthly interest rate (annual / 12 / 100)
   */
  calculateMonthlyPayment(amount: number, annualRate: number, months: number): number {
    if (amount <= 0 || months <= 0) return 0;
    if (annualRate === 0) return amount / months;

    const monthlyRate = annualRate / 100 / 12;
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
    const denominator = Math.pow(1 + monthlyRate, months) - 1;

    return amount * (numerator / denominator);
  }

  /**
   * Generates the amortization schedule.
   */
  generateSchedule(params: MortgageParams): MonthlyPayment[] {
    const { amount, rate, months, startDate } = params;
    const monthlyPayment = this.calculateMonthlyPayment(amount, rate, months);
    const monthlyRate = rate / 100 / 12;

    let currentDebt = amount;
    const schedule: MonthlyPayment[] = [];

    // Clone date to avoid mutating the original
    const currentDate = new Date(startDate);

    for (let i = 1; i <= months; i++) {
      // Calculate interest for this month
      const interest = currentDebt * monthlyRate;

      // Principal part is payment minus interest
      let principal = monthlyPayment - interest;

      // Handle last month precision issues or if debt is less than payment
      if (currentDebt - principal < 0.01) {
        principal = currentDebt;
      }

      currentDebt -= principal;
      if (currentDebt < 0) currentDebt = 0;

      schedule.push({
        month: i,
        date: new Date(currentDate),
        payment: principal + interest,
        interest,
        principal,
        remainingDebt: currentDebt,
      });

      // Increment month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return schedule;
  }

  /**
   * Calculates the current debt based on the current date using an existing schedule.
   * If no schedule is provided, it generates one.
   */
  getCurrentDebt(params: MortgageParams, existingSchedule?: MonthlyPayment[]): number {
    const schedule = existingSchedule || this.generateSchedule(params);
    const now = new Date();

    // Find the latest entry where date <= now
    const pastPayments = schedule.filter(p => p.date <= now);

    if (pastPayments.length === 0) {
      return params.amount; // No payments yet
    }

    if (pastPayments.length >= schedule.length) {
      return 0; // Paid off
    }

    return pastPayments[pastPayments.length - 1].remainingDebt;
  }

  /**
   * Calculates interest paid per year from a schedule
   */
  calculateYearlyInterest(schedule: MonthlyPayment[]): { yearly: YearlyInterest[], total: number } {
    const interestByYear = new Map<number, number>();
    let total = 0;

    schedule.forEach(payment => {
      const year = payment.date.getFullYear();
      const current = interestByYear.get(year) || 0;
      interestByYear.set(year, current + payment.interest);
      total += payment.interest;
    });

    const yearly = Array.from(interestByYear.entries())
      .map(([year, interest]) => ({ year, interest }))
      .sort((a, b) => a.year - b.year);

    return { yearly, total };
  }
}
