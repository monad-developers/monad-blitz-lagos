import { useBalance, useConnect, useDisconnect, useAccount, useChainId, useSwitchChain } from "wagmi";
import { MONAD_TESTNET } from "@paypilot/shared";

export function WalletPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const balanceQuery = useBalance({
    address,
    query: {
      enabled: Boolean(address),
    },
  });

  const wrongChain = isConnected && chainId !== MONAD_TESTNET.id;

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Wallet Connect</p>
          <h2>Bring your Monad testnet wallet</h2>
        </div>
        <span className={`badge ${isConnected ? "badge-success" : "badge-muted"}`}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {isConnected ? (
        <div className="wallet-stack">
          <div className="detail-grid">
            <div>
              <span>Address</span>
              <strong>{address}</strong>
            </div>
            <div>
              <span>Network</span>
              <strong>{wrongChain ? "Switch required" : "Monad Testnet"}</strong>
            </div>
            <div>
              <span>MON balance</span>
              <strong>
                {balanceQuery.data
                  ? `${Number(balanceQuery.data.formatted).toFixed(4)} ${balanceQuery.data.symbol}`
                  : "Loading..."}
              </strong>
            </div>
          </div>

          <div className="rule-actions">
            {wrongChain ? (
              <button
                type="button"
                className="primary-button"
                disabled={isSwitching}
                onClick={() => switchChainAsync({ chainId: MONAD_TESTNET.id })}
              >
                {isSwitching ? "Switching..." : "Switch to Monad"}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-stack">
          <p className="form-hint">
            Connecting a wallet lets the dashboard check balances and submit the prepared transaction from the browser.
          </p>
          <div className="rule-actions">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                className="primary-button"
                disabled={isPending}
                onClick={() => connectAsync({ connector })}
              >
                {isPending ? "Connecting..." : `Connect ${connector.name}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
