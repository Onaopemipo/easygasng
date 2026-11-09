# Gas price calculator

Web and native clients share `packages/business-rules/src/gas-pricing.ts`. `grams()` parses quantities into integer grams; unsupported precision, non-positive quantities and unsafe integer ranges fail. `gasLine()` multiplies grams by integer kobo per kilogram with BigInt arithmetic, divides by 1,000 and rounds half-up once per cylinder line. Financial totals never use a floating-point multiplication as their authority. The server repeats validation against active configuration.

The calculator reads `gas.catalogue`; authoritative review calls `gas.quote` with cylinder capacities, desired quantities and any physical cart items. Quantity limits, increments, precision and permitted capacities come from approved settings. The interface includes manual numeric entry, increment/decrement controls, shortcuts, additional cylinders, location selection and a size guide. The homepage compact calculator carries its selections into `/gas-order`.

At NGN 1,800/kg and NGN 5,000 delivery:

| Gas | Gas subtotal | Total with one delivery |
|---|---:|---:|
| 3 kg | 5,400 | 10,400 |
| 6 kg | 10,800 | 15,800 |
| 7.5 kg | 13,500 | 18,500 |
| 12.5 kg | 22,500 | 27,500 |
| 25 kg | 45,000 | 50,000 |
| 50 kg | 90,000 | 95,000 |
| 7 kg + 4 kg | 19,800 | 24,800 |

These are gas estimates, excluding a new cylinder and installation. A displayed full-capacity estimate does not bypass a smaller approved maximum purchase or physical filling restrictions. Limits remain unconfigured in the business database until supplied by EasyGas. Review failures preserve entered data. Price changes refresh the quotation; server confirmation checks versions and the exact accepted total. Physical product prices are also re-read by the quotation and confirmation paths.
