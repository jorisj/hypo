function calculateMonthlyPayment(amount, annualRate, months) {
    if (amount <= 0 || months <= 0) return 0;
    if (annualRate === 0) return amount / months;

    const monthlyRate = annualRate / 100 / 12;
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
    const denominator = Math.pow(1 + monthlyRate, months) - 1;

    return amount * (numerator / denominator);
}

const amount = 300000;
const rate = 4.0;
const months = 360;

const payment = calculateMonthlyPayment(amount, rate, months);
console.log(`Payment: ${payment}`);

const expected = 1432.25;
if (Math.abs(payment - expected) < 0.01) {
    console.log("PASS: Payment calculation is correct.");
} else {
    console.error(`FAIL: Expected ${expected}, got ${payment}`);
    process.exit(1);
}
