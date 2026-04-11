# Monarchade Smart Contract

A brand engagement platform on Monad allowing brands to create gaming challenges with on-chain prize pools, verified scores, and transparent reward distribution.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Testnet MON — get from [testnet.monad.xyz](https://testnet.monad.xyz)

## Build

```bash
forge build
```

## Test

```bash
forge test -v
```

## Deploy

### 1. Generate a server signer wallet

This wallet is authorized to submit scores and distribute rewards on-chain. Fund it with testnet MON.

```bash
cast wallet new
# Copy the address and private key
# Fund at: https://testnet.monad.xyz
```

### 2. Deploy the contract

The deploy script reads `SERVER_SIGNER_ADDRESS` from the environment and sets a 5% (500 bps) platform fee.

```bash
export SERVER_SIGNER_ADDRESS=<signer address>
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --private-key "<key>"
```

Set `SERVER_SIGNER_ADDRESS` before running:

```bash
export SERVER_SIGNER_ADDRESS=0xYourServerSignerAddress
```

### 3. Verify the contract

```bash
forge verify-contract \
  --rpc-url https://testnet-rpc.monad.xyz \
  --verifier sourcify \
  --verifier-url 'https://sourcify-api-monad.blockvision.org/' \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" 0xb566ae57c560B77bF987ECcE59f0BE774B7F2B15 500) \
  0x10a8AcA2738d1C59Ccbaa234350807d206D42990 \
  src/Monarchade.sol:Monarchade
```

## Contract Overview

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `createChallenge(metadataHash, deadline, winnerCount)` | Anyone (payable) | Create a challenge and deposit MON as the prize pool. Returns `challengeId`. |
| `startChallenge(challengeId)` | Brand only | Start the challenge — sets `startTime` and `endTime` (startTime + deadline). |
| `submitScore(challengeId, player, score)` | Server signer | Record a verified player score (max 300). Allowed until `endTime + 5 min` grace. |
| `distributeRewards(challengeId, winners[], amounts[])` | Server signer | Distribute the prize pool to winners after the submission window closes. |
| `refundBrand(challengeId)` | Brand only | Reclaim funds if the challenge has 0 submissions. If started, must wait `endTime + 5 min + 48 hours`. |

### Admin Functions

| Function | Access | Description |
|----------|--------|-------------|
| `updateServerSigner(newSigner)` | Owner | Update the authorized server signer address. |
| `updatePlatformFee(newFeeBps)` | Owner | Update the platform fee (max 1000 bps / 10%). |
| `emergencyWithdraw()` | Owner | Withdraw excess funds (above `totalEscrowed`) sent to the contract by accident. |

### View Functions

| Function | Description |
|----------|-------------|
| `getChallenge(challengeId)` | Returns full challenge struct. |
| `getPlayers(challengeId)` | Returns array of player addresses. |
| `getPlayerScore(challengeId, player)` | Returns `(score, hasPlayed)`. |
| `isActive(challengeId)` | `true` while the challenge accepts new players (between `startTime` and `endTime`). |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SCORE` | 300 | Maximum allowed score per submission. |
| `REFUND_DELAY` | 48 hours | Wait period after challenge ends before brand can refund. |
| `SUBMIT_GRACE` | 5 minutes | Grace period after `endTime` for late score submissions. |

### Challenge Lifecycle

```
createChallenge (brand deposits MON, fee deducted)
       │
       ▼
 startChallenge (brand sets start/end times)
       │
       ▼
  submitScore (server signer records scores during active window)
       │
       ▼
  endTime + 5 min grace
       │
       ├──▶ distributeRewards (server signer pays winners)
       │
       └──▶ refundBrand (if 0 submissions, after 48h delay)
```
== Logs ==
  Monarchade deployed at: 0x10a8AcA2738d1C59Ccbaa234350807d206D42990
  Server signer: 0xb566ae57c560B77bF987ECcE59f0BE774B7F2B15
  Chain ID: 10143