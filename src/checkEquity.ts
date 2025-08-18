import { initDrift, getEquityUsd } from "./drift";

async function checkEquityDetails() {
  console.log("🔍 Detailed Equity Analysis");
  console.log("=" .repeat(50));
  
  try {
    const { drift } = await initDrift();
    const user = drift.getUser();
    
    if (!user) {
      console.log("❌ No user account found");
      return;
    }
    
    const userAccount = user.getUserAccount();
    
    // Get various equity calculations
    const totalCollateral = user.getTotalCollateral();
    const freeCollateral = user.getFreeCollateral();
    const unrealizedPnl = user.getUnrealizedPNL();
    const totalAssetValue = user.getTotalAssetValue();
    const totalLiabilityValue = user.getTotalLiabilityValue();
    
    console.log("\n💰 EQUITY BREAKDOWN:");
    console.log(`Total Collateral: $${(totalCollateral.toNumber() / 1e6).toFixed(6)}`);
    console.log(`Free Collateral: $${(freeCollateral.toNumber() / 1e6).toFixed(6)}`);
    console.log(`Total Asset Value: $${(totalAssetValue.toNumber() / 1e6).toFixed(6)}`);
    console.log(`Total Liability Value: $${(totalLiabilityValue.toNumber() / 1e6).toFixed(6)}`);
    console.log(`Unrealized PnL: $${(unrealizedPnl.toNumber() / 1e6).toFixed(6)}`);
    
    console.log("\n📊 SPOT POSITIONS:");
    userAccount.spotPositions.forEach((pos, i) => {
      if (!pos.scaledBalance.isZero()) {
        const balance = pos.scaledBalance.toNumber() / 1e6;
        console.log(`  Market ${pos.marketIndex}: ${balance.toFixed(6)} (${balance > 0 ? 'Asset' : 'Liability'})`);
      }
    });
    
    console.log("\n📈 PERP POSITIONS:");
    userAccount.perpPositions.forEach((pos, i) => {
      if (!pos.baseAssetAmount.isZero()) {
        const baseAmount = pos.baseAssetAmount.toNumber() / 1e6;
        const quoteAmount = pos.quoteAssetAmount.toNumber() / 1e6;
        const side = baseAmount > 0 ? "LONG" : "SHORT";
        console.log(`  Market ${pos.marketIndex}: ${side} ${Math.abs(baseAmount).toFixed(6)} (Quote: ${quoteAmount.toFixed(6)})`);
        
        try {
          const unrealizedPnlForMarket = user.getUnrealizedPNL(true, pos.marketIndex);
          console.log(`    Unrealized PnL: $${(unrealizedPnlForMarket.toNumber() / 1e6).toFixed(6)}`);
        } catch (e) {
          console.log(`    Unrealized PnL: Unable to calculate`);
        }
      }
    });
    
    console.log("\n🏦 ACCOUNT SUMMARY:");
    console.log(`Account Public Key: ${userAccount.authority.toString()}`);
    console.log(`Sub Account ID: ${userAccount.subAccountId}`);
    console.log(`Max Margin Ratio: ${userAccount.maxMarginRatio}`);
    console.log(`Next Liquidation ID: ${userAccount.nextLiquidationId}`);
    
    // Compare with our getEquityUsd function
    const ourEquity = await getEquityUsd(drift);
    console.log(`\n🔄 OUR EQUITY FUNCTION: $${ourEquity.toFixed(6)}`);
    
    // Calculate net worth manually
    const netWorth = totalAssetValue.toNumber() - totalLiabilityValue.toNumber();
    console.log(`📊 MANUAL NET WORTH: $${(netWorth / 1e6).toFixed(6)}`);
    
  } catch (error) {
    console.error("❌ Error checking equity:", error);
  }
}

if (require.main === module) {
  checkEquityDetails().then(() => {
    console.log("\n✅ Equity check complete");
    process.exit(0);
  }).catch(console.error);
}
