
import { getWattonCost, runSmartBillPrescriptiveAnalysis } from './smartBill';
import { TariffCycle, VoltageLevel } from '../types';

/**
 * TEST SUITE (Simulated)
 */
export const runTests = () => {
    console.log("--- STARTING SMARTBILL ENGINE TESTS ---");

    // TEST 1: Unit Conversion and Selection (BTN > 20.7 kVA)
    // Caso do Cliente Específico do Prompt
    // Voltage: BTN, Power: 34.5 (>20.7), Cycle: Tri-Hourly
    const costsBTNHigh = getWattonCost(VoltageLevel.BTN, TariffCycle.TRI_HOURLY, 34.5);
    
    console.log("TEST 1 [BTN > 20.7 Tri-Horario]:");
    console.log(`Expected Ponta: 0.099777 €/kWh`);
    console.log(`Actual Ponta:   ${costsBTNHigh.ponta} €/kWh`);
    
    const passed1 = costsBTNHigh.ponta === 0.099777;
    console.log(passed1 ? "✅ PASS" : "❌ FAIL");

    // TEST 2: Unit Conversion and Selection (BTN < 20.7 kVA)
    // Voltage: BTN, Power: 10.35 (<20.7), Cycle: Tri-Hourly
    const costsBTNLow = getWattonCost(VoltageLevel.BTN, TariffCycle.TRI_HOURLY, 10.35);
    console.log("\nTEST 2 [BTN < 20.7 Tri-Horario]:");
    console.log(`Expected Ponta: 0.100570 €/kWh`);
    console.log(`Actual Ponta:   ${costsBTNLow.ponta} €/kWh`);
    
    const passed2 = costsBTNLow.ponta === 0.100570;
    console.log(passed2 ? "✅ PASS" : "❌ FAIL");

    console.log("--- TESTS COMPLETED ---");
};
