/* ====================== trustwallet.js ====================== */
/**
 * Патч, который активируется ТОЛЬКО если dApp открыт
 * во встроенном браузере **Trust Wallet** (Android / iOS).
 *
 * 1. Находит инжектированный провайдер Trust Wallet.
 * 2. Гарантирует сеть BNB Smart Chain Mainnet (chain 56).
 * 3. Запрашивает список аккаунтов (eth_requestAccounts).
 * 4. Затем вызывает вашу исходную connect() из app.js,
 *    поэтому интерфейс остаётся тем же.
 *
 * Поместите файл в js/trustwallet.js и подключите ПОСЛЕ ethers,
 * но ДО app.js:
 *   <script src="js/ethers.umd.min.js"></script>
 *   <script src="js/walletconnect.js"></script>
 *   <script src="js/trustwallet.js"></script>
 *   <script src="js/app.js"></script>
 */
(function () {
  const BSC_CHAIN_ID_HEX = '0x38'; // 56

  /** Возвращает TrustWallet‑провайдер или null */
  function getTrustWallet() {
    const isTW = p => p && p.isTrust;
    if (typeof window === 'undefined') return null;

    // 1) Простой случай – единственный injected provider
    if (isTW(window.ethereum)) return window.ethereum;

    // 2) Если несколько кошельков – ищем во множественном массиве
    if (window.ethereum?.providers) {
      const tw = window.ethereum.providers.find(isTW);
      if (tw) return tw;
    }

    // 3) Историческое место
    return window.trustwallet?.ethereum || null;
  }

  const twProvider = getTrustWallet();
  if (!twProvider) {
    // Не Trust Wallet – ничего не делаем
    return;
  }

  console.info('[trustwallet.js] Trust Wallet detected');

  /** Переключает пользователя на BNB Smart Chain, если нужно */
  async function ensureBsc() {
    const current = await twProvider.request({ method: 'eth_chainId' });
    if (current === BSC_CHAIN_ID_HEX) return;

    try {
      await twProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID_HEX }]
      });
    } catch (err) {
      // Цепочка не добавлена – добавим вручную
      if (err.code === 4902) {
        await twProvider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BSC_CHAIN_ID_HEX,
            chainName: 'BNB Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com']
          }]
        });
      } else {
        throw err;
      }
    }
  }

  // Сохраняем ссылку на исходную функцию connect()
  const originalConnect = window.connect;

  // Переопределяем глобальный connect()
  window.connect = async function () {
    try {
      await ensureBsc();
      // Trust Wallet требует явный запрос на доступ к аккаунтам
      await twProvider.request({ method: 'eth_requestAccounts' });
      return originalConnect();
    } catch (e) {
      console.error('[trustwallet.js]', e);
      if (typeof showAlert === 'function') {
        showAlert(humanError(e), false);
      }
    }
  };

})();
