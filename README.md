# 🚀 Flow-State: The Granular Ride Protocol

**Developed for Monad Blitz Lagos 2026** *Turning Time into a Liquid Asset through High-Frequency Streaming.*

---

## 📌 Overview
In high-congestion cities like Lagos, traditional ride-sharing pricing is broken. Flat rates hurt drivers in traffic, and distance-based rates can feel like a gamble for passengers. 

**Flow-State** is a decentralized, peer-to-peer protocol that enables **per-second value streaming**. Using Monad’s 400ms block times, we’ve built a trustless "Live Meter." Money moves from the passenger to the driver block-by-block. No middlemen, no commissions, and zero payment latency.

## 🛠 The Monad Edge (Bespoke Features)

This protocol is architected specifically for the **Monad MONAD_NINE** upgrade:

* **Sub-Second Settlement:** Leveraging **400ms block times** to make the payment stream feel fluid and real-time.
* **MIP-4 Solvency Guard:** Utilizes the `0x1001` precompile (`dippedIntoReserve()`) to check passenger solvency. The ride auto-terminates if the passenger cannot afford the next 30 seconds.
* **EIP-7702 Auto-Push:** Passengers grant session-limited permissions, allowing the protocol to "push" funds to the driver without requiring a manual wallet signature every second.
* **Parallel Execution Lanes:** Every ride is deployed as a separate state object (Minimal Proxy), ensuring that 10,000+ simultaneous rides never cause state contention or gas spikes.
* **MonadDb Efficiency:** High-frequency "heartbeat" transactions are processed with near-zero I/O overhead, keeping transaction costs at a fraction of a cent.

---

## 🏗 System Architecture

### 1. The Smart Contract (`FlowRide.sol`)
The core logic manages the lifecycle of a ride. It calculates debt based on real-time block progression rather than manual input.
* **Logic:** `Total_Debt = (Current_Block - Start_Block) * Rate_Per_Block`

### 2. The Solvency Engine
A background "Watchdog" (integrated into the Driver’s client) verifies the passenger's ability to pay using Monad's native introspection:
```solidity
// Logic inside the FlowRide contract
function checkSolvency(address passenger) public view returns (bool) {
    // Calls Monad's Reserve Balance Introspection Precompile
    return !IReserve(0x1001).dippedIntoReserve(passenger);
}