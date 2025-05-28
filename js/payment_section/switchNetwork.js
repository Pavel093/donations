document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  function getWalletInfo() {
    const ua = navigator.userAgent || '';
    const isTrust = ua.includes("Trust") || window.ethereum?.isTrust;
    const isMetaMask = window.ethereum?.isMetaMask;

    if (isTrust) {
      return {
        name: 'Trust Wallet',
        icon: '/img/trustwallet.svg'
      };
	  
    } else {
      return {
        name: 'your wallet',
        icon: '/img/wallet.png'
      };
    }
  }

  function showModal({ title, message, actionLabel, onAction }) {
    const wallet = getWalletInfo();
    $('popupTitle').textContent = title;
    $('popupMessage').innerHTML = `
      <img src="${wallet.icon}" alt="${wallet.name}" class="mx-auto w-12 h-12 mb-4">
      ${message}
    `;
    const btn = $('popupAction');
    btn.textContent = actionLabel;
    btn.onclick = onAction;

    $('overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function hideModal() {
    $('overlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  // --- параметры сети BNB Smart Chain (mainnet) ---
  const BSC_CHAIN_ID = '0x38';
  const BSC_PARAMS = {
    chainId: BSC_CHAIN_ID,
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com']
  };

  async function switchToBSC() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID }]
      });
      return true;
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_PARAMS]
          });
          return true;
        } catch (addErr) {
          console.error(addErr);
        }
      }
      console.error(err);
      return false;
    }
  }

  async function ensureBSC() {
    const current = await window.ethereum.request({ method: 'eth_chainId' });
    if (current === BSC_CHAIN_ID) return true;

    return new Promise(resolve => {
      showModal({
        title: 'Incorrect Network',
        message:
          'To donate, please switch to <strong>BNB Smart Chain</strong> (BSC).',
        actionLabel: 'Switch Network',
        onAction: async () => {
          const ok = await switchToBSC();
          hideModal();
          resolve(ok);
        }
      });
    });
  }

  window.ensureBSC = ensureBSC;
});
