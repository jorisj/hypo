import { Routes } from '@angular/router';
import { MortgageCalculatorComponent } from './features/mortgage-calculator/mortgage-calculator.component';

export const routes: Routes = [
    {
        path: '',
        component: MortgageCalculatorComponent
    },
    {
        path: 'yearly-interest',
        loadComponent: () => import('./features/yearly-interest/yearly-interest.component').then(m => m.YearlyInterestComponent)
    }
];
