## QUOTE — examples

```
/quote EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05
/quote sol:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05
/quote eth:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 0.05
/quote base:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 0.05
/quote usdc:sol 0.05
/quote usdc:eth 0.05
/quote wbtc:base 0.05
/quote usdc 0.05
```
## SWAP — examples

```
/swap EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05
/swap sol:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05
/swap eth:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 0.05
/swap base:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 0.05
/swap usdc:sol 0.05
/swap usdc:eth 0.05
/swap wbtc:base 0.05
/swap usdc 0.05
```

## TEXT ONLY (auto-suggestion triggers)

```
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
sol:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
usdc
usdc:sol
wbtc:base
```

Notes (quick)

• Amount is the native input for the detected chain (e.g., SOL on Solana).
• Prefer canonical addresses for precision; symbols can exist on multiple chains.
• Symbol-only (e.g., “usdc”) may require disambiguation (use symbol:chain like “usdc:sol”).
