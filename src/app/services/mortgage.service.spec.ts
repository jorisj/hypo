import { TestBed } from '@angular/core/testing';
import { MortgageService } from './mortgage.service';

describe('MortgageService', () => {
    let service: MortgageService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MortgageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should calculate monthly payment correctly', () => {
        // Example: 300,000 EUR, 4%, 360 months
        // Monthly rate = 4 / 100 / 12 = 0.003333...
        // Payment should be approx 1432.25
        const payment = service.calculateMonthlyPayment(300000, 4, 360);
        expect(payment).toBeCloseTo(1432.25, 2);
    });

    it('should generate correct schedule length', () => {
        const params = {
            amount: 300000,
            rate: 4,
            months: 360,
            startDate: new Date('2024-01-01')
        };
        const schedule = service.generateSchedule(params);
        expect(schedule.length).toBe(360);
        expect(schedule[schedule.length - 1].remainingDebt).toBe(0);
    });

    it('should calculate current debt correctly', () => {
        const params = {
            amount: 300000,
            rate: 4,
            months: 360,
            startDate: new Date() // Started today
        };

        // If started today, debt should be full amount (assuming no payment made yet instantly)
        // Our logic checks if payment date <= now.
        // The first payment is 1 month from start.
        expect(service.getCurrentDebt(params)).toBe(300000);

        // If started 1 month ago
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        // Adjust for day difference if needed, but roughly:

        const paramsPast = {
            ...params,
            startDate: oneMonthAgo
        };

        // Should have made 1 payment
        // We need to be careful with "exact month" logic in test vs service
        // Service adds 1 month to startDate for first payment.
        // If today is 2024-02-01 and start was 2024-01-01, first payment is 2024-02-01.
        // So if we run this test, we need to ensure "now" matches the payment date logic.

        // Let's rely on the schedule generation test for exact math, 
        // and just check that debt decreases.

        const debt = service.getCurrentDebt(paramsPast);
        expect(debt).toBeLessThan(300000);
    });
});
